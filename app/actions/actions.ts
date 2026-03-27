'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import dedent from 'dedent';
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { ensureDbConnected, Logo } from '@/db';
import Stripe from 'stripe';

function getAIClient(): OpenAI {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) {
    throw new Error('NEBIUS_API_KEY is not defined in environment variables');
  }
  const { HELICONE_API_KEY } = process.env;
  return new OpenAI({
    apiKey,
    baseURL: HELICONE_API_KEY
      ? "https://nebius.helicone.ai/v1/"
      : "https://api.studio.nebius.ai/v1/",
    ...(HELICONE_API_KEY && {
      defaultHeaders: { "Helicone-Auth": `Bearer ${HELICONE_API_KEY}` },
    }),
  });
}

// Vision model for analysis tasks (segmentation, font detection)
const NEBIUS_VISION_MODEL = 'Qwen/Qwen2.5-VL-72B-Instruct';

// LLM model for blueprint design (text/JSON generation)
const NEBIUS_LLM_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-10-29.clover' });
}

const FormSchema = z.object({
  companyName: z.string(),
  style: z.string(),
  symbolPreference: z.string(),
  additionalInfo: z.string().optional(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  model: z.enum(['black-forest-labs/flux-schnell', 'black-forest-labs/flux-dev']),
  size: z.enum(['256x256','512x512','1024x1024']).default('512x512'),
  quality: z.enum(['standard', 'hd']).default('standard'),
});

const styleLookup: { [key: string]: string } = {
  flashy: "Flashy, attention grabbing, bold, futuristic, and eye-catching. Use vibrant neon colors with metallic, shiny, and glossy accents.",
  tech: "highly detailed, sharp focus, cinematic, photorealistic, Minimalist, clean, sleek, neutral color pallete with subtle accents, clean lines, shadows, and flat.",
  corporate: "modern, forward-thinking, flat design, geometric shapes, clean lines, natural colors with subtle accents, use strategic negative space to create visual interest.",
  creative: "playful, lighthearted, bright bold colors, rounded shapes, lively.",
  abstract: "abstract, artistic, creative, unique shapes, patterns, and textures to create a visually interesting and wild logo.",
  minimal: "minimal, simple, timeless, versatile, single color logo, use negative space, flat design with minimal details, Light, soft, and subtle.",
};





// Helper: convert any hex color to a human-readable color name for AI prompts
function hexToColorName(hex: string): string {
  // Quick lookup for common exact matches
  const exactMap: Record<string, string> = {
    '#000000': 'black',
    '#ffffff': 'white',
    '#ff0000': 'red',
    '#00ff00': 'green',
    '#0000ff': 'blue',
    '#ffff00': 'yellow',
    '#ff00ff': 'magenta',
    '#00ffff': 'cyan',
    '#2563eb': 'blue',
    '#dc2626': 'red',
    '#d97706': 'orange',
    '#16a34a': 'green',
    '#9333ea': 'purple',
    '#f8fafc': 'light gray',
  };
  const lower = hex.toLowerCase();
  if (exactMap[lower]) return exactMap[lower];

  // Parse RGB and derive a readable name from hue, saturation, lightness
  const r = parseInt(lower.slice(1, 3), 16) / 255;
  const g = parseInt(lower.slice(3, 5), 16) / 255;
  const b = parseInt(lower.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  if (s < 0.1) {
    if (l < 0.15) return 'black';
    if (l < 0.35) return 'dark gray';
    if (l < 0.65) return 'gray';
    if (l < 0.85) return 'light gray';
    return 'white';
  }

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  const prefix = l < 0.3 ? 'dark ' : l > 0.7 ? 'light ' : '';
  let hue: string;
  if (h < 15 || h >= 345) hue = 'red';
  else if (h < 40) hue = 'orange';
  else if (h < 65) hue = 'yellow';
  else if (h < 155) hue = 'green';
  else if (h < 185) hue = 'cyan';
  else if (h < 260) hue = 'blue';
  else if (h < 290) hue = 'purple';
  else if (h < 330) hue = 'pink';
  else hue = 'red';

  return `${prefix}${hue}`;
}

// ─── Blueprint-based Component Pipeline (Nebius-only) ────────────────────────

import type { LogoBlueprint, BlueprintComponent } from '@/lib/blueprint-renderer';
import { blueprintToPng } from '@/lib/blueprint-renderer';

/**
 * Use Nebius LLM to design a structured logo blueprint from user inputs.
 * Returns a LogoBlueprint with component positions, text, fonts, and icon descriptions.
 */
export async function designBlueprint(opts: {
  companyName: string;
  style: string;
  primaryColor: string;
  backgroundColor: string;
  additionalInfo?: string;
}): Promise<LogoBlueprint> {
  const client = getAIClient();
  const primaryColorName = hexToColorName(opts.primaryColor) || opts.primaryColor;
  const bgColorName = hexToColorName(opts.backgroundColor) || opts.backgroundColor;
  const styleDesc = styleLookup[opts.style] || opts.style || 'modern and professional';

  const prompt = dedent`You are a professional logo designer. Design a logo blueprint as a JSON object for the brand "${opts.companyName}".

Design style: ${styleDesc}
Primary color: ${primaryColorName} (${opts.primaryColor})
Background color: ${bgColorName} (${opts.backgroundColor})
${opts.additionalInfo ? `Brand context: ${opts.additionalInfo}` : ''}

You MUST return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "width": 1024,
  "height": 1024,
  "backgroundColor": "${opts.backgroundColor}",
  "components": [
    {
      "type": "icon",
      "label": "Main Icon",
      "x": <number 0-1024>,
      "y": <number 0-1024>,
      "width": <number>,
      "height": <number>,
      "color": "${opts.primaryColor}",
      "iconDescription": "<SIMPLE flat icon description — must be a bold single-shape silhouette>"
    },
    {
      "type": "text",
      "label": "Brand Name",
      "x": <number>,
      "y": <number>,
      "width": <number>,
      "height": <number>,
      "color": "<hex color for text>",
      "text": "${opts.companyName}",
      "fontFamily": "<Google Font name: Poppins, Montserrat, Playfair Display, Dancing Script, Cinzel, Libre Baskerville, or Roboto Mono>",
      "fontWeight": "bold" or "normal",
      "fontStyle": "normal" or "italic",
      "fontSize": <number, typically 60-120>
    }
  ]
}

CRITICAL RULES:
1. All coordinates use a 1024×1024 space
2. Include EXACTLY 2 components: 1 icon and 1 text (brand name). Keep it simple — no decorations
3. The icon should be CENTERED ABOVE the text, with clear spacing (no overlap)
4. For the icon, the iconDescription MUST describe a SIMPLE, BOLD, FLAT silhouette shape — like a geometric animal, letter, shield, or abstract mark. NO gradients, NO fine details, NO realistic objects. Think of icons like the Nike swoosh, Apple apple, or Twitter bird — a single bold shape that works as a clean silhouette. The icon must be a SOLID FILLED shape on a plain background
5. Components must NOT overlap — leave at least 40px gap between icon and text
6. Center the entire composition within the 1024×1024 canvas — icon centered horizontally, text centered below
7. Choose fontFamily from ONLY these Google Fonts: Poppins, Montserrat, Playfair Display, Dancing Script, Cinzel, Libre Baskerville, Roboto Mono
8. Make the icon LARGE (at least 300x300) so it's visually prominent
9. Return ONLY the JSON object. Start with { and end with }`;

  const response = await client.chat.completions.create({
    model: NEBIUS_LLM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2048,
  });

  let text = (response.choices?.[0]?.message?.content || '').trim();

  // Strip markdown fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  // Find outermost JSON object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  // Clean common LLM JSON issues
  text = text
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/'/g, '"');

  const parsed = JSON.parse(text);

  // Validate and normalize
  const blueprint: LogoBlueprint = {
    width: 1024,
    height: 1024,
    backgroundColor: parsed.backgroundColor || opts.backgroundColor,
    components: [],
  };

  for (const c of parsed.components || []) {
    if (!c.type || !c.label) continue;
    const comp: BlueprintComponent = {
      type: c.type,
      label: c.label,
      x: Math.max(0, Math.min(1024, Number(c.x) || 0)),
      y: Math.max(0, Math.min(1024, Number(c.y) || 0)),
      width: Math.max(20, Number(c.width) || 100),
      height: Math.max(20, Number(c.height) || 100),
      color: c.color || opts.primaryColor,
    };

    if (c.type === 'text') {
      comp.text = c.text || opts.companyName;
      comp.fontFamily = c.fontFamily || 'Poppins';
      comp.fontWeight = c.fontWeight || 'bold';
      comp.fontStyle = c.fontStyle || 'normal';
      comp.fontSize = Number(c.fontSize) || 80;
    }

    if (c.iconDescription) {
      comp.iconDescription = c.iconDescription;
    }

    blueprint.components.push(comp);
  }

  // Ensure at least a brand name text component exists
  if (!blueprint.components.some(c => c.type === 'text')) {
    blueprint.components.push({
      type: 'text',
      label: 'Brand Name',
      x: 212,
      y: 700,
      width: 600,
      height: 120,
      color: opts.primaryColor,
      text: opts.companyName,
      fontFamily: 'Poppins',
      fontWeight: 'bold',
      fontStyle: 'normal',
      fontSize: 80,
    });
  }

  return blueprint;
}

/**
 * Generate an icon image via Nebius Flux, then vectorize it to SVG paths using potrace.
 * Returns svgPath/svgViewBox for vector editing, plus a base64 raster fallback.
 */
export async function generateIconWithFlux(opts: {
  description: string;
  color: string;
  model: string;
  size?: string;
}): Promise<{
  svgPath: string;
  svgViewBox: string;
  svgContent: string;
  imageUrl: string;
  iconBase64: string; // base64 data URL of the icon (raster fallback for editor)
}> {
  const client = getAIClient();
  const sharpMod = (await import('sharp')).default;

  // Generate icon image with Flux — prompt optimized for clean bold silhouette
  const colorName = hexToColorName(opts.color) || opts.color;
  const prompt = `A single bold ${colorName} (${opts.color}) silhouette icon on a pure white background. The icon is: ${opts.description}. Flat vector style, solid filled shape, no gradients, no text, no shadows, no outlines, high contrast, centered on white, minimal clean design, logo icon. The icon color MUST be exactly ${colorName}.`;

  const response = await client.images.generate({
    model: opts.model || 'black-forest-labs/flux-schnell',
    prompt,
    response_format: 'url',
    size: (opts.size as any) || '512x512',
    n: 1,
  });

  const imageUrl = response.data?.[0]?.url || '';
  if (!imageUrl) throw new Error('Flux returned no image for icon');

  // Download the icon image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download icon image: ${imgRes.status}`);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

  // Remove white background → transparent PNG for the editor
  // Flood-fill from corners to detect white-ish pixels and make them transparent
  const iconPng = await sharpMod(imgBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(async ({ data: rawPixels, info }) => {
      // Make white/near-white pixels transparent
      const threshold = 240;
      for (let i = 0; i < rawPixels.length; i += 4) {
        if (rawPixels[i] > threshold && rawPixels[i + 1] > threshold && rawPixels[i + 2] > threshold) {
          rawPixels[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }
      return sharpMod(rawPixels, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toBuffer();
    });
  const iconBase64 = `data:image/png;base64,${iconPng.toString('base64')}`;

  // Convert to high-contrast black-on-white for potrace vectorization
  // Try multiple threshold levels for best path extraction
  let svgPath = '';
  let svgViewBox = '0 0 512 512';
  let svgContent = '';

  for (const threshold of [128, 100, 160, 80]) {
    try {
      const processedBuffer = await sharpMod(imgBuffer)
        .greyscale()
        .threshold(threshold)
        .png()
        .toBuffer();

      const tracedSvg = await new Promise<string>((resolve, reject) => {
        const potrace = require('potrace');
        potrace.trace(processedBuffer, {
          color: opts.color,
          threshold,
          turdSize: 2,
          optTolerance: 0.2,
        }, (err: Error | null, svg: string) => {
          if (err) reject(err);
          else resolve(svg);
        });
      });

      // Extract path — try both patterns (with and without whitespace before d=)
      const pathMatch = tracedSvg.match(/d="([^"]{20,})"/);
      if (pathMatch) {
        const vbMatch = tracedSvg.match(/viewBox="([^"]+)"/);
        svgPath = pathMatch[1];
        svgViewBox = vbMatch ? vbMatch[1] : '0 0 512 512';
        svgContent = tracedSvg;
        break; // Good vectorization found
      }
    } catch {
      // Try next threshold
    }
  }

  return { svgPath, svgViewBox, svgContent, imageUrl, iconBase64 };
}

/**
 * Full component-based logo generation pipeline:
 * 1. LLM designs blueprint (component layout, text, icon descriptions)
 * 2. Flux generates a full logo image AND individual icons in parallel
 * 3. Potrace vectorizes icons to SVG
 * 4. Returns the Flux image URL (for display/DB) + blueprint with SVG data (for editor)
 */
export async function generateLogoWithBlueprint(formData: z.infer<typeof FormSchema>): Promise<{
  success: boolean;
  url?: string;
  blueprint?: LogoBlueprint;
  error?: string;
}> {
  'use server';
  try {
    const validatedData = FormSchema.parse(formData);
    const primaryColorName = hexToColorName(validatedData.primaryColor) || validatedData.primaryColor;
    const secondaryColorName = hexToColorName(validatedData.secondaryColor) || validatedData.secondaryColor;
    const styleDesc = styleLookup[validatedData.style] || validatedData.style || 'modern and professional';

    // Step 1: Design blueprint via Nebius LLM
    const blueprint = await designBlueprint({
      companyName: validatedData.companyName,
      style: validatedData.style,
      primaryColor: validatedData.primaryColor,
      backgroundColor: validatedData.secondaryColor,
      additionalInfo: validatedData.additionalInfo,
    });

    // Step 2: In parallel — generate a full Flux logo image AND vectorize individual icons
    const iconComponents = blueprint.components.filter(
      c => c.type !== 'text' && c.iconDescription
    );

    // Build the full logo prompt from the blueprint
    const fullLogoPrompt = dedent`Design a premium brand logo for "${validatedData.companyName}". Style: ${styleDesc}. STRICT COLOR REQUIREMENTS: The logo MUST use exactly ${primaryColorName} (${validatedData.primaryColor}) as the primary/foreground color and ${secondaryColorName} (${validatedData.secondaryColor}) as the background color. Do NOT use any other colors — only these two colors are allowed. The logo must have a distinctive, meaningful icon/symbol and the company name in clear typography.${validatedData.additionalInfo ? ` Brand context: ${validatedData.additionalInfo}` : ""}`;

    const client = getAIClient();

    // Run full image generation + icon vectorization in parallel
    const [fullImageResult, ...iconResults] = await Promise.allSettled([
      // Generate the full logo image via Flux (returns a cloud URL)
      client.images.generate({
        model: validatedData.model,
        prompt: fullLogoPrompt,
        response_format: 'url',
        size: validatedData.size,
        n: 1,
      }),
      // Generate + vectorize each icon component
      ...iconComponents.map(c =>
        generateIconWithFlux({
          description: c.iconDescription!,
          color: c.color,
          model: validatedData.model,
          size: '512x512',
        })
      ),
    ]);

    // Get the full logo URL (cloud-hosted, suitable for DB)
    let imageUrl = '';
    if (fullImageResult.status === 'fulfilled') {
      imageUrl = fullImageResult.value.data?.[0]?.url || '';
    }
    if (!imageUrl) {
      // Fallback: render blueprint to PNG data URL
      imageUrl = await blueprintToPng(blueprint, 1024);
    }

    // Attach SVG data + raster fallback back to blueprint components
    iconComponents.forEach((comp, i) => {
      const result = iconResults[i];
      if (result && result.status === 'fulfilled') {
        const iconData = result.value as {
          svgPath: string; svgViewBox: string; svgContent: string;
          imageUrl: string; iconBase64: string;
        };
        comp.svgPath = iconData.svgPath;
        comp.svgViewBox = iconData.svgViewBox;
        // Only store svgContent if we actually got a valid path
        if (iconData.svgPath) {
          comp.svgContent = iconData.svgContent;
        }
        // Always store the raster fallback — editor uses this when vectorization fails
        comp.iconBase64 = iconData.iconBase64;
      }
    });

    return {
      success: true,
      url: imageUrl,
      blueprint,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Blueprint pipeline failed',
    };
  }
}

export async function generateLogo(formData: z.infer<typeof FormSchema>) {
  'use server';
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check credits from Clerk metadata
    const isDev = process.env.NODE_ENV === 'development';
    const currentRemaining = (user.unsafeMetadata?.remaining as number) || 0;

    if (!isDev && currentRemaining <= 0) {
      return {
        success: false,
        error: "You've run out of credits. Please purchase more credits to continue."
      };
    }

    // Deduct 1 credit (skipped in development)
    if (!isDev) {
      await (await clerkClient()).users.updateUserMetadata(user.id, {
        unsafeMetadata: { remaining: currentRemaining - 1 },
      });
    }

    // Credits deducted — run the blueprint component pipeline
    const validatedData = FormSchema.parse(formData);

    // Use the blueprint pipeline: LLM designs → Flux generates icons → potrace vectorizes
    const result = await generateLogoWithBlueprint(formData);
    if (!result.success || !result.url) {
      throw new Error(result.error || 'Blueprint pipeline failed');
    }

    const imageUrl = result.url;

    const DatabaseData = {
      image_url: imageUrl,
      primary_color: validatedData.primaryColor,
      background_color: validatedData.secondaryColor,
      username: user.username ?? user.firstName ?? 'Anonymous',
      userId: user.id,
    };

    try {
      await ensureDbConnected();
      await Logo.create(DatabaseData);
    } catch (error) {
      const dbError = error instanceof Error
        ? new Error(`Database insertion failed: ${error.message}`)
        : new Error('Database insertion failed: Unknown error');
      dbError.cause = error;
      throw dbError;
    }

    return {
      success: true,
      url: imageUrl,
      blueprint: result.blueprint,
    };
  } catch (error) {
    // Return error information without exposing internal details
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate logo' };
  }
}

// Nebius/Flux variations (4 styles)
const NEBIUS_VARIATIONS = [
  { name: 'Minimalist', suffix: 'Ultra-minimalist logo. Single bold geometric icon shape above clean sans-serif text. Maximum white space. Only 1-2 flat colors, no gradients. Inspired by Apple and Nike — abstract simple symbol. The icon must be a single clean flat shape silhouette.' },
  { name: 'Bold Modern', suffix: 'Bold modern logo. Strong thick icon with rounded corners above bold sans-serif text. High contrast, 2 colors maximum. Inspired by Spotify and Airbnb. The icon must be a single distinctive bold shape silhouette, no fine details.' },
  { name: 'Elegant Premium', suffix: 'Elegant premium logo. Refined icon above elegant serif text. Muted sophisticated palette, maximum 2 colors. Inspired by Chanel and Rolex — use a clean monogram, shield, or crest shape. The icon must be a single clean outlined or filled shape.' },
  { name: 'Creative Playful', suffix: 'Creative playful logo. Friendly rounded icon above rounded sans-serif text. Vibrant colors, maximum 2. Inspired by Slack and Mailchimp — organic friendly shape. The icon must be a single simple fun shape silhouette, no complex details.' },
];

// Gemini variations (4 different styles for variety)
const GEMINI_VARIATIONS = [
  { name: 'Clean Geometric', suffix: 'Geometric precision logo. Sharp clean geometric shapes forming the icon above geometric sans-serif text. Mathematically balanced proportions. Inspired by Mastercard and Audi — circles, triangles, or interlocking shapes. Pure flat design, maximum 2 colors.' },
  { name: 'Organic Flow', suffix: 'Organic flowing logo. Smooth curved icon with natural flowing lines above soft rounded text. Inspired by Pepsi and Firefox — organic wave, leaf, or flowing abstract shape. Smooth edges, no sharp corners, maximum 2 colors.' },
  { name: 'Retro Vintage', suffix: 'Retro vintage logo. Classic icon with timeless appeal above bold vintage-style text. Inspired by Harley-Davidson and Levi\'s — badge, emblem, or crest style. Clean and simple, maximum 2 colors, no fine textures.' },
  { name: 'Tech Futuristic', suffix: 'Futuristic tech logo. Sharp angular icon with forward-looking design above modern tech-style text. Inspired by Tesla and SpaceX — sleek abstract geometric mark. High contrast, maximum 2 colors, clean lines.' },
];

const GEMINI_MODEL = 'gemini-2.5-flash-image';

/**
 * Generate a single logo image using Gemini API (REST).
 * Returns a base64 data URL of the generated image.
 */
async function generateLogoWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['image', 'text'],
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error(`[Gemini] API error ${response.status}:`, errText);
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imagePart?.inlineData?.data) {
    console.error('[Gemini] No image in response. Parts:', JSON.stringify(parts.map((p: any) => Object.keys(p))));
    throw new Error('Gemini returned no image');
  }

  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

export async function generate8Logos(formData: z.infer<typeof FormSchema>) {
  'use server';
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated', logos: [] };
    }

    const isDev = process.env.NODE_ENV === 'development';
    const currentRemaining = (user.unsafeMetadata?.remaining as number) || 0;

    if (!isDev && currentRemaining < 8) {
      return {
        success: false,
        error: 'You need at least 8 credits to generate logo variations.',
        logos: [],
      };
    }

    if (!isDev) {
      await (await clerkClient()).users.updateUserMetadata(user.id, {
        unsafeMetadata: { remaining: currentRemaining - 8 },
      });
    }

    const validatedData = FormSchema.parse(formData);
    const nebiusClient = getAIClient();
    const primaryColorName = validatedData.primaryColor ? hexToColorName(validatedData.primaryColor) : 'blue';
    const secondaryColorName = validatedData.secondaryColor ? hexToColorName(validatedData.secondaryColor) : 'white';
    const userStyleDesc = styleLookup[validatedData.style] || '';

    const colorInstruction = `STRICT COLOR REQUIREMENTS: The logo MUST use exactly ${primaryColorName} (${validatedData.primaryColor}) as the primary/foreground color and ${secondaryColorName} (${validatedData.secondaryColor}) as the background color. Do NOT use any other colors — only these two colors are allowed.`;
    const styleInstruction = userStyleDesc ? ` Design style: ${userStyleDesc}` : '';
    const contextInstruction = validatedData.additionalInfo ? ` Brand context: ${validatedData.additionalInfo}` : '';

    // ── Nebius/Flux: 4 logos ──
    const nebiusPromise = Promise.allSettled(
      NEBIUS_VARIATIONS.map(async (variation, i) => {
        if (i > 0) await new Promise(r => setTimeout(r, i * 500));
        const prompt = `Design a professional brand logo for "${validatedData.companyName}". ${colorInstruction}${styleInstruction} The logo features a single bold icon/symbol ABOVE the company name "${validatedData.companyName}" in clean typography. Simple flat design, no gradients, no 3D effects. Easy to edit. ${variation.suffix}${contextInstruction}`;
        const response = await nebiusClient.images.generate({
          model: validatedData.model,
          prompt,
          response_format: 'url',
          size: validatedData.size,
          n: 1,
        });
        return { url: response.data?.[0]?.url || '', style: variation.name };
      })
    );

    // ── Gemini: 4 logos ──
    const geminiPromise = Promise.allSettled(
      GEMINI_VARIATIONS.map(async (variation, i) => {
        if (i > 0) await new Promise(r => setTimeout(r, i * 600));
        const prompt = `Generate an image of a professional brand logo for "${validatedData.companyName}". ${colorInstruction}${styleInstruction} The logo features a single bold icon/symbol ABOVE the company name "${validatedData.companyName}" in clean typography. Simple flat design, no gradients, no 3D effects. Easy to edit. ${variation.suffix}${contextInstruction}`;
        const url = await generateLogoWithGemini(prompt);
        return { url, style: variation.name };
      })
    );

    // Run both providers in parallel
    const [nebiusResults, geminiResults] = await Promise.all([nebiusPromise, geminiPromise]);

    const nebiusLogos = nebiusResults.map((result, i) => ({
      url: result.status === 'fulfilled' ? result.value.url : '',
      style: NEBIUS_VARIATIONS[i].name,
      success: result.status === 'fulfilled' && !!result.value.url,
    }));

    const geminiLogos = geminiResults.map((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[Gemini] Variation "${GEMINI_VARIATIONS[i].name}" failed:`, result.reason?.message || result.reason);
      }
      return {
        url: result.status === 'fulfilled' ? result.value.url : '',
        style: GEMINI_VARIATIONS[i].name,
        success: result.status === 'fulfilled' && !!result.value.url,
      };
    });

    const logos = [...nebiusLogos, ...geminiLogos];

    // Save successful logos to MongoDB
    try {
      await ensureDbConnected();
      await Promise.allSettled(
        logos
          .filter((l) => l.success && l.url && !l.url.startsWith('data:'))
          .map((l) =>
            Logo.create({
              image_url: l.url,
              primary_color: validatedData.primaryColor,
              background_color: validatedData.secondaryColor,
              username: user.username ?? user.firstName ?? 'Anonymous',
              userId: user.id,
            })
          )
      );
    } catch (_) {
      // DB errors don't block the response
    }

    return { success: true, logos };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate logos',
      logos: [],
    };
  }
}

export async function checkHistory() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    await ensureDbConnected();
    const userLogos = await Logo.find({ userId: user.id }).sort({ createdAt: -1 }).limit(50);

    return userLogos.map(logo => ({
      id: logo._id.toString(),
      _id: logo._id.toString(),
      image_url: logo.image_url,
      primary_color: logo.primary_color,
      background_color: logo.background_color,
      username: logo.username,
      userId: logo.userId,
      is_edited: logo.is_edited ?? false,
      createdAt: logo.createdAt,
      updatedAt: logo.updatedAt,
    }));
  } catch (error) {
    console.error('[checkHistory] Failed to fetch logos:', error);
    return { error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function allLogos(){
  try{
    await ensureDbConnected();
    const allLogos = await Logo.find({}).sort({ createdAt: -1 }).limit(100);
    return allLogos.map(logo => ({
      id: logo._id.toString(),
      _id: logo._id.toString(),
      image_url: logo.image_url,
      primary_color: logo.primary_color,
      background_color: logo.background_color,
      username: logo.username,
      userId: logo.userId,
      is_edited: logo.is_edited ?? false,
      createdAt: logo.createdAt,
      updatedAt: logo.updatedAt,
    }));
  } catch (error) {
    // Log error but don't expose to client
    // In production, use proper logging service
    return null;
  }
}

export async function downloadImage(url: string) {
  'use server';

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    return {
      success: true,
      data: `data:${contentType};base64,${base64Image}`
    };

  } catch (error) {
    // Return error without exposing internal details
    return {
      success: false,
      error: 'Failed to download image'
    };
  }
}

// Google Font mapping for each detected font style
const FONT_STYLE_MAP: Record<string, string> = {
  'serif':        'Playfair Display',
  'sans-serif':   'Poppins',
  'script':       'Dancing Script',
  'decorative':   'Cinzel',
  'modern':       'Montserrat',
  'vintage':      'Libre Baskerville',
  'monospace':    'Roboto Mono',
};

export async function detectTextFont(base64Data: string, mimeType: string): Promise<{
  text: string;
  fontStyle: string;
  googleFont: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
}> {
  'use server';
  try {
    const client = getAIClient();

    const prompt = `Analyze this logo text image. Extract the exact text and font characteristics.
Return ONLY a JSON object:
{
  "text": "exact text content — preserve capitalization, punctuation, symbols",
  "fontStyle": "serif" | "sans-serif" | "script" | "decorative" | "modern" | "vintage" | "monospace",
  "color": "#hexcolor of the text (not background)",
  "isBold": true | false,
  "isItalic": true | false
}`;

    const response = await client.chat.completions.create({
      model: NEBIUS_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          { type: 'text', text: prompt },
        ],
      }],
      temperature: 0.0,
      max_tokens: 256,
    });

    let textContent = (response.choices?.[0]?.message?.content || '{}').trim();

    // Strip markdown fences if present
    const fence = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) textContent = fence[1].trim();

    const parsed = JSON.parse(textContent);
    const fontStyle: string = parsed.fontStyle || 'sans-serif';
    const googleFont = FONT_STYLE_MAP[fontStyle] || 'Poppins';

    return {
      text: String(parsed.text || ''),
      fontStyle,
      googleFont,
      color: String(parsed.color || '#000000'),
      isBold: Boolean(parsed.isBold),
      isItalic: Boolean(parsed.isItalic),
    };
  } catch {
    return { text: '', fontStyle: 'sans-serif', googleFont: 'Poppins', color: '#000000', isBold: false, isItalic: false };
  }
}

export async function getCredits() {
  'use server';
  try {
    const user = await currentUser();
    if (!user) {
      return { remaining: 0, limit: 999999 };
    }

    // Initialize free credits for first-time users
    const FREE_CREDITS = 10;
    if (!user.unsafeMetadata || user.unsafeMetadata.remaining === undefined) {
      await (await clerkClient()).users.updateUserMetadata(user.id, {
        unsafeMetadata: {
          remaining: FREE_CREDITS,
        },
      });
      return {
        remaining: FREE_CREDITS,
        limit: 999999
      };
    }
    
    // Get credits from Clerk metadata
    const remaining = (user.unsafeMetadata.remaining as number) || 0;
    
    // Return unlimited display - credits are tracked individually
    return { 
      remaining,
      limit: 999999
    };
  } catch (error) {
    // Return default credits on error
    return { remaining: 0, limit: 999999 };
  }
}

export async function createStripeCheckoutSession(planId: string) {
  'use server';
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Map plan IDs to Stripe price IDs and credit amounts
    const planConfig: Record<string, { priceId: string; credits: number }> = {
      basic: {
        priceId: process.env.STRIPE_PRICE_ID_BASIC || '',
        credits: 50,
      },
      pro: {
        priceId: process.env.STRIPE_PRICE_ID_PRO || '',
        credits: 150,
      },
      enterprise: {
        priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
        credits: 500,
      },
    };

    const config = planConfig[planId];
    if (!config || !config.priceId) {
      return { success: false, error: 'Invalid plan or Stripe not configured' };
    }

    // Create Stripe checkout session
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      customer_email: user.emailAddresses[0]?.emailAddress,
      payment_method_types: ['card'],
      line_items: [
        {
          price: config.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/credits?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/credits?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        planId,
        credits: config.credits.toString(),
      },
    });

    return {
      success: true,
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    // Return error without exposing internal details
    return { success: false, error: 'Failed to create checkout session' };
  }
}

export async function saveEditedLogo({
  imageDataUrl,
  primaryColor,
  backgroundColor,
}: {
  imageDataUrl: string;
  primaryColor: string;
  backgroundColor: string;
}) {
  'use server';
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: 'User not authenticated' };

    await ensureDbConnected();
    await Logo.create({
      image_url: imageDataUrl,
      primary_color: primaryColor,
      background_color: backgroundColor,
      username: user.username ?? user.firstName ?? 'Anonymous',
      userId: user.id,
      is_edited: true,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to save edited logo' };
  }
}

export async function reEditWithAI(formData: z.infer<typeof FormSchema>) {
  'use server';
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: 'User not authenticated' };

    const isDev = process.env.NODE_ENV === 'development';
    const currentRemaining = (user.unsafeMetadata?.remaining as number) || 0;

    if (!isDev && currentRemaining <= 0) {
      return { success: false, error: "You've run out of credits. Please purchase more credits to continue." };
    }

    // Deduct 1 credit (skipped in development)
    if (!isDev) {
      await (await clerkClient()).users.updateUserMetadata(user.id, {
        unsafeMetadata: { remaining: currentRemaining - 1 },
      });
    }

    // Use blueprint pipeline for re-edit too
    const result = await generateLogoWithBlueprint(formData);
    if (!result.success || !result.url) {
      return { success: false, error: result.error || 'No image returned from AI' };
    }

    return { success: true, url: result.url, blueprint: result.blueprint };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to regenerate logo' };
  }
}

// ─── Logo segmentation via Nebius Vision ─────────────────────────────────────
export interface LogoComponent {
  label: string;
  type: 'text' | 'icon' | 'shape' | 'decoration';
  text?: string; // Only for type === 'text'
  bbox: { x: number; y: number; w: number; h: number }; // Pixel coords relative to image
  color?: string; // Dominant color as hex
}

export async function segmentLogo(imageDataUrl: string): Promise<{
  success: boolean;
  components?: LogoComponent[];
  error?: string;
}> {
  'use server';
  try {
    const client = getAIClient();

    // Extract base64 data and mime type from data URL — handle all mime formats
    const match = imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid image data URL format');
    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = dedent`Analyze this logo image carefully. Your job is to identify EVERY distinct visual component in the logo.

You MUST return a JSON array where each element has these exact fields:
{
  "label": "descriptive name like Globe Icon or Company Name",
  "type": "text" or "icon" or "shape" or "decoration",
  "text": "actual text content (REQUIRED if type is text, omit otherwise)",
  "bbox": {"x": left_px, "y": top_px, "w": width_px, "h": height_px},
  "color": "#hexcolor"
}

CRITICAL RULES YOU MUST FOLLOW:
1. bbox values MUST be in PIXEL coordinates (integers like 120, 340, 280, 60) — NOT normalized 0-1 values
2. For a 1024x1024 image, x and y range from 0 to 1024, w and h are positive pixel sizes
3. Identify EVERY element: text/brand names, icons, symbols, shapes, lines, swooshes, borders, dots, arrows, decorative elements
4. Merge words that form one brand name into a SINGLE text component (e.g. "SWAMZ" is one component, not separate letters)
5. Do NOT include the background — only foreground elements
6. Every logo has AT LEAST 2 components (a brand name + an icon/shape). If you only see one, look harder
7. Bounding boxes should TIGHTLY wrap each component with 2-5px padding
8. type MUST be exactly one of: "text", "icon", "shape", "decoration"

Return ONLY the JSON array. No markdown fences, no explanation, no preamble. Start with [ and end with ]

Example for a logo with a shield and company name:
[{"label":"Shield Icon","type":"icon","bbox":{"x":150,"y":80,"w":220,"h":240},"color":"#2563eb"},{"label":"Company Name","type":"text","text":"ACME","bbox":{"x":120,"y":340,"w":280,"h":60},"color":"#1a1a2e"}]`;

    // Retry up to 2 times on failure
    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: NEBIUS_VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
              { type: 'text', text: prompt },
            ],
          }],
          temperature: 0.05,
          max_tokens: 4096,
        });

        let textContent = (response.choices?.[0]?.message?.content || '').trim();

        // Robust JSON extraction — handle all response formats
        let jsonStr = textContent;

        // Strip markdown code blocks if present
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

        // Find the outermost JSON array
        const firstBracket = jsonStr.indexOf('[');
        const lastBracket = jsonStr.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
        }

        // Clean common JSON issues from LLM output
        jsonStr = jsonStr
          .replace(/,\s*]/g, ']')    // trailing commas before ]
          .replace(/,\s*}/g, '}')    // trailing commas before }
          .replace(/'/g, '"');       // single quotes → double quotes

        let parsed: any[];
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          lastError = `JSON parse failed. Raw: ${textContent.slice(0, 200)}`;
          continue;
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
          lastError = 'Vision model returned empty array';
          continue;
        }

        // Normalize and validate each component
        const validComponents: LogoComponent[] = [];
        for (const c of parsed) {
          if (!c.label || !c.type || !c.bbox) continue;

          // Ensure type is valid
          const validTypes = ['text', 'icon', 'shape', 'decoration'];
          if (!validTypes.includes(c.type)) c.type = 'shape';

          let { x, y, w, h } = c.bbox;

          // Convert to numbers in case they're strings
          x = Number(x); y = Number(y); w = Number(w); h = Number(h);
          if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) continue;

          // Detect if model returned normalized 0-1 values instead of pixel values
          // If ALL bbox values are between 0 and 1, they're likely normalized
          const allNormalized = x <= 1 && y <= 1 && w <= 1 && h <= 1 && x >= 0 && y >= 0;
          if (allNormalized && w > 0 && h > 0) {
            // Assume 1024x1024 image (most common logo size)
            // The actual scaling is handled on the canvas side
            x = Math.round(x * 1024);
            y = Math.round(y * 1024);
            w = Math.round(w * 1024);
            h = Math.round(h * 1024);
          }

          // Model sometimes returns bbox as percentages (0-100 range)
          if (x <= 100 && y <= 100 && w <= 100 && h <= 100 && w > 1 && h > 1) {
            // Check if values look like percentages (all ≤100 and at least w+x > 100 would be pixels)
            // Heuristic: if max dimension is ≤ 100, probably percentages
            const maxVal = Math.max(x + w, y + h);
            if (maxVal <= 100) {
              x = Math.round(x * 10.24);
              y = Math.round(y * 10.24);
              w = Math.round(w * 10.24);
              h = Math.round(h * 10.24);
            }
          }

          if (w <= 0 || h <= 0) continue;

          validComponents.push({
            label: String(c.label),
            type: c.type as LogoComponent['type'],
            text: c.type === 'text' ? String(c.text || c.label || '') : undefined,
            bbox: { x, y, w, h },
            color: c.color ? String(c.color) : undefined,
          });
        }

        if (validComponents.length === 0) {
          lastError = 'All components failed validation';
          continue;
        }

        return { success: true, components: validComponents };
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
        continue;
      }
    }

    // All retries failed
    throw new Error(lastError || 'Segmentation failed after retries');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to segment logo',
    };
  }
}
