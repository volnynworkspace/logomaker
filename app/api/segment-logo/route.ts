import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const VISION_MODEL = 'Qwen/Qwen2.5-VL-72B-Instruct';

function getAIClient(): OpenAI {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) throw new Error('NEBIUS_API_KEY is not defined');
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisComponent {
  label: string;
  type: 'icon' | 'text' | 'decoration';
  text: string | null;
  role?: 'brand' | 'tagline' | null;
  fontDescription?: string | null;
}

interface AnalysisResult {
  count: number;
  components: AnalysisComponent[];
}

interface NormalizedComponent {
  label: string;
  type: string;
  text?: string;
  role?: string;
  fontDescription?: string;
  bbox: { x: number; y: number; w: number; h: number };
  color?: string;
}

// ─── Step 1 prompt ────────────────────────────────────────────────────────────
const ANALYSIS_PROMPT = `You are a precise logo decomposition system with OCR capabilities.

Your task is to analyze this logo image and break it into ALL distinct visual components.

DEFINITION OF COMPONENTS:

1. "icon": The main symbol or graphic (e.g. flower, shield, abstract mark)
2. "text": Each separate line of text MUST be a separate component. Brand name and tagline are ALWAYS separate.
3. "decoration": Borders, circles, lines, dividers, ornaments, frames, patterns, wreaths, rings, swooshes, leaf patterns

CRITICAL RULES:
- Detect ALL distinct visual components — count depends on the logo design
- NEVER merge brand name and tagline into one component
- NEVER merge icon with surrounding decorative elements (wreaths, borders, rings)
- Detect small elements (lines, separators, circles, dividers)
- DO NOT include background or empty space

TEXT EXTRACTION (MANDATORY):
- Extract EXACT visible text — preserve capitalization, symbols (&, ., etc.)
- NEVER return placeholder text like "Logo Text"
- "role": "brand" for main company name, "tagline" for subtitles/slogans
- "fontDescription": brief style (e.g. "bold serif", "thin sans-serif", "decorative script")

VALIDATION (before returning):
- If text exists: ensure at least ONE text component has role "brand"
- If a second smaller text line exists: it MUST be a separate "tagline" component
- Report exactly as many components as you can visually identify — do not force a minimum or maximum

Respond with ONLY valid JSON. No markdown. No explanation:
{
  "count": <integer>,
  "components": [
    { "label": "short descriptive name", "type": "icon" | "text" | "decoration", "text": "exact text or null", "role": "brand" | "tagline" | null, "fontDescription": "brief style description or null" }
  ]
}`;

// ─── Step 2 prompt — bounding box detection ────────────────────────────────────
// Model returns bboxes as [y_min, x_min, y_max, x_max] in 0-1000 normalized scale.
function buildSegmentationPrompt(analysis: AnalysisResult): string {
  const componentList = analysis.components
    .map((c, i) => {
      let desc = `  ${i + 1}. "${c.label}" (type: ${c.type})`;
      if (c.text) desc += ` — readable text: "${c.text}"`;
      if (c.role) desc += ` [role: ${c.role}]`;
      if (c.fontDescription) desc += ` [font: ${c.fontDescription}]`;
      return desc;
    })
    .join('\n');

  return `Detect and locate each component in this logo image using bounding boxes.

This logo has these components:
${componentList}

For EACH component, return a JSON object with:
- "label": the component name (must match the names above)
- "type": the component type
- "text": exact text content or null
- "role": "brand", "tagline", or null
- "fontDescription": brief font style or null
- "box_2d": [y_min, x_min, y_max, x_max] — bounding box coordinates in 0-1000 normalized scale where 0=top/left edge, 1000=bottom/right edge
- "color": the dominant hex color of this element

CRITICAL RULES for box_2d:
- The box MUST fully enclose the entire component with NO parts cut off
- Include a small margin around each component — it is better to be slightly too large than to clip any content
- For text: include ALL characters, descenders (g, p, y, q), ascenders (b, d, f, h, k, l, t), and any decorative flourishes
- For icons: include the complete shape including any thin edges, shadows, or fine details
- Boxes should NOT overlap each other
- Use 0-1000 scale: [0, 0, 1000, 1000] = entire image

Return ONLY a JSON array:
[
  {"label":"...","type":"...","text":null,"role":null,"fontDescription":null,"box_2d":[y_min,x_min,y_max,x_max],"color":"#hex"}
]`;
}

// ─── Targeted retry prompt for missing components ────────────────────────────
function buildMissingComponentPrompt(
  missing: AnalysisComponent[],
  found: NormalizedComponent[]
): string {
  const foundList = found
    .map(c => {
      // Convert back to 0-1000 scale for consistency with the prompt format
      const y_min = Math.round(c.bbox.y / 1024 * 1000);
      const x_min = Math.round(c.bbox.x / 1024 * 1000);
      const y_max = Math.round((c.bbox.y + c.bbox.h) / 1024 * 1000);
      const x_max = Math.round((c.bbox.x + c.bbox.w) / 1024 * 1000);
      return `  - "${c.label}" (${c.type}) at box_2d [${y_min}, ${x_min}, ${y_max}, ${x_max}]`;
    })
    .join('\n');

  const missingList = missing
    .map((c, i) =>
      `  ${i + 1}. "${c.label}" (type: ${c.type})${c.text ? ` — readable text: "${c.text}"` : ''}`
    )
    .join('\n');

  return `You previously located these components in a logo image:
${foundList}

But you MISSED these components that are definitely present in the image:
${missingList}

IMPORTANT: Text components are usually BELOW or BESIDE the icon. Look carefully for text that may be small or near the bottom/right of the image.

For each missing component, return a JSON object with box_2d in 0-1000 normalized scale [y_min, x_min, y_max, x_max].
The box MUST fully enclose the component — do NOT clip any edges.

Return ONLY a JSON array with the missing components:
[
  {"label":"...","type":"...","text":null,"role":null,"fontDescription":null,"box_2d":[y_min,x_min,y_max,x_max],"color":"#hex"}
]`;
}

// ─── Call Nebius vision API ───────────────────────────────────────────────────
async function callVisionModel(
  mimeType: string,
  base64Data: string,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  const client = getAIClient();

  const response = await client.chat.completions.create({
    model: VISION_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
        { type: 'text', text: prompt },
      ],
    }],
    temperature: 0.0,
    max_tokens: maxTokens,
  });

  const text = (response.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('Vision model returned empty text');

  return text;
}

// ─── Clean up raw model text before JSON parsing ─────────────────────────────
function cleanJSON(raw: string): string {
  // Strip markdown code fences
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();

  // Fix smart/curly quotes
  raw = raw
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  // Remove trailing commas before ] or }
  raw = raw.replace(/,\s*([}\]])/g, '$1');

  return raw;
}

// ─── Robust JSON array extraction ─────────────────────────────────────────────
// Handles: complete arrays, truncated arrays, single objects, wrapped objects
function extractJSONArray(raw: string): any[] | null {
  const cleaned = cleanJSON(raw);

  // Try 1: Direct parse (model returned clean JSON)
  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) return direct;
    // Single object → wrap in array
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      // Could be { components: [...] } wrapper or a single component
      if (Array.isArray(direct.components)) return direct.components;
      if (direct.label && direct.bbox) return [direct];
    }
  } catch { /* continue to manual extraction */ }

  // Try 2: Find array brackets
  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');

  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
    } catch { /* try repair */ }
  }

  // Try 3: Truncated array — has [ but no ] (MAX_TOKENS cutoff)
  if (arrStart !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > arrStart) {
      // Try closing the array after the last complete object
      try {
        return JSON.parse(cleaned.slice(arrStart, lastBrace + 1) + ']');
      } catch {
        // Remove last incomplete object
        const lastComma = cleaned.lastIndexOf('},', lastBrace);
        if (lastComma > arrStart) {
          try {
            return JSON.parse(cleaned.slice(arrStart, lastComma + 1) + ']');
          } catch { /* give up */ }
        }
      }
    }
  }

  // Try 4: No array at all — find individual objects
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try {
      const obj = JSON.parse(cleaned.slice(objStart, objEnd + 1));
      if (obj.label && obj.bbox) return [obj];
      if (Array.isArray(obj.components)) return obj.components;
    } catch { /* give up */ }
  }

  return null;
}

// ─── Validate & normalize a single component ─────────────────────────────────
// Supports both:
//   - box_2d: [y_min, x_min, y_max, x_max] in 0-1000 scale (native detection)
//   - bbox: {x, y, w, h} in 1024 scale (legacy format)
function normalizeComponent(c: any): NormalizedComponent | null {
  if (!c.label || !c.type) return null;

  const validTypes = ['text', 'icon', 'decoration', 'shape'];
  if (!validTypes.includes(c.type)) c.type = 'icon';

  let x: number, y: number, w: number, h: number;

  // Prefer box_2d (native detection format) — more accurate
  if (Array.isArray(c.box_2d) && c.box_2d.length === 4) {
    const [y_min, x_min, y_max, x_max] = c.box_2d.map(Number);
    if ([y_min, x_min, y_max, x_max].some(isNaN)) return null;
    // Convert from 0-1000 scale to 0-1024 scale
    x = Math.round(x_min * 1024 / 1000);
    y = Math.round(y_min * 1024 / 1000);
    w = Math.round((x_max - x_min) * 1024 / 1000);
    h = Math.round((y_max - y_min) * 1024 / 1000);
  } else if (c.bbox) {
    // Legacy {x, y, w, h} format
    x = Number(c.bbox.x); y = Number(c.bbox.y);
    w = Number(c.bbox.w); h = Number(c.bbox.h);
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return null;

    // Auto-scale: 0–1 normalized → 1024
    if (x <= 1 && y <= 1 && w <= 1 && h <= 1 && w > 0 && h > 0) {
      x = Math.round(x * 1024); y = Math.round(y * 1024);
      w = Math.round(w * 1024); h = Math.round(h * 1024);
    }

    // Auto-scale: 0–100 percentage → 1024
    if (x <= 100 && y <= 100 && w <= 100 && h <= 100 && w > 1 && h > 1) {
      if (Math.max(x + w, y + h) <= 100) {
        x = Math.round(x * 10.24); y = Math.round(y * 10.24);
        w = Math.round(w * 10.24); h = Math.round(h * 10.24);
      }
    }
  } else {
    return null;
  }

  // Clamp to canvas bounds
  x = Math.max(0, x); y = Math.max(0, y);
  w = Math.min(w, 1024 - x); h = Math.min(h, 1024 - y);
  if (w < 10 || h < 10) return null;

  return {
    label: String(c.label),
    type: c.type as string,
    text: c.type === 'text' ? String(c.text || c.label || '') : undefined,
    role: c.type === 'text' ? String(c.role || '') || undefined : undefined,
    fontDescription: c.type === 'text' ? String(c.fontDescription || '') || undefined : undefined,
    bbox: { x, y, w, h },
    color: c.color ? String(c.color) : undefined,
  };
}

// ─── IoU deduplication ────────────────────────────────────────────────────────
function deduplicateByIoU(components: NormalizedComponent[]): NormalizedComponent[] {
  return components.filter((comp, i) => {
    for (let j = 0; j < i; j++) {
      const a = components[j].bbox;
      const b = comp.bbox;
      const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const inter = ix * iy;
      const union = a.w * a.h + b.w * b.h - inter;
      if (union > 0 && inter / union > 0.5) return false;
    }
    return true;
  });
}

// ─── Priority for overlap resolution (higher = keep, lower = shrink) ─────────
function typePriority(type: string): number {
  if (type === 'text') return 3;
  if (type === 'icon') return 2;
  return 1; // decoration
}

// ─── Resolve overlap between two boxes with priority ─────────────────────────
function resolveOverlap(
  a: NormalizedComponent,
  b: NormalizedComponent
): void {
  const ax2 = a.bbox.x + a.bbox.w;
  const ay2 = a.bbox.y + a.bbox.h;
  const bx2 = b.bbox.x + b.bbox.w;
  const by2 = b.bbox.y + b.bbox.h;

  // Check for overlap
  const overlapX = Math.max(0, Math.min(ax2, bx2) - Math.max(a.bbox.x, b.bbox.x));
  const overlapY = Math.max(0, Math.min(ay2, by2) - Math.max(a.bbox.y, b.bbox.y));
  if (overlapX <= 0 || overlapY <= 0) return; // No overlap

  // Determine which component to shrink (lower priority shrinks)
  const priA = typePriority(a.type);
  const priB = typePriority(b.type);
  const [keeper, shrinker] = priA >= priB ? [a, b] : [b, a];

  const kx2 = keeper.bbox.x + keeper.bbox.w;
  const ky2 = keeper.bbox.y + keeper.bbox.h;

  // Determine separation axis — use the axis with less overlap
  if (overlapY <= overlapX) {
    // Vertical separation: shrinker moves away vertically
    const shrinkerCenterY = shrinker.bbox.y + shrinker.bbox.h / 2;
    const keeperCenterY = keeper.bbox.y + keeper.bbox.h / 2;
    if (shrinkerCenterY < keeperCenterY) {
      // Shrinker is above — clip its bottom
      shrinker.bbox.h = Math.max(10, keeper.bbox.y - shrinker.bbox.y);
    } else {
      // Shrinker is below — clip its top
      const newTop = ky2;
      const lost = newTop - shrinker.bbox.y;
      shrinker.bbox.y = newTop;
      shrinker.bbox.h = Math.max(10, shrinker.bbox.h - lost);
    }
  } else {
    // Horizontal separation
    const shrinkerCenterX = shrinker.bbox.x + shrinker.bbox.w / 2;
    const keeperCenterX = keeper.bbox.x + keeper.bbox.w / 2;
    if (shrinkerCenterX < keeperCenterX) {
      shrinker.bbox.w = Math.max(10, keeper.bbox.x - shrinker.bbox.x);
    } else {
      const newLeft = kx2;
      const lost = newLeft - shrinker.bbox.x;
      shrinker.bbox.x = newLeft;
      shrinker.bbox.w = Math.max(10, shrinker.bbox.w - lost);
    }
  }
}

// ─── Post-segmentation refinement pipeline ───────────────────────────────────
// Ensures: no overlap, all boxes inside canvas, smart padding, no clipping
function refineComponents(components: NormalizedComponent[]): NormalizedComponent[] {
  const CANVAS = 1024;
  const PAD = 8; // safety margin

  // Step 1: Resolve all pairwise overlaps (priority-aware)
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      resolveOverlap(components[i], components[j]);
    }
  }

  // Step 2: Expand text bboxes that look too narrow for their content
  for (const comp of components) {
    if (comp.type !== 'text' || !comp.text) continue;
    // Heuristic: estimate minimum width needed based on character count
    // Average char width in 1024-space ≈ 20-30px depending on font
    const minWidthEstimate = comp.text.length * 22;
    if (comp.bbox.w < minWidthEstimate) {
      const expand = minWidthEstimate - comp.bbox.w;
      const expandLeft = Math.min(expand / 2, comp.bbox.x);
      const expandRight = Math.min(expand / 2, CANVAS - (comp.bbox.x + comp.bbox.w));
      comp.bbox.x = Math.round(comp.bbox.x - expandLeft);
      comp.bbox.w = Math.round(comp.bbox.w + expandLeft + expandRight);
    }
  }

  // Step 3: Re-resolve overlaps after expansion
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      resolveOverlap(components[i], components[j]);
    }
  }

  // Step 4: Add safety padding (but clamp to canvas and never re-introduce overlap)
  for (const comp of components) {
    comp.bbox.x = Math.max(0, comp.bbox.x - PAD);
    comp.bbox.y = Math.max(0, comp.bbox.y - PAD);
    comp.bbox.w = Math.min(comp.bbox.w + PAD * 2, CANVAS - comp.bbox.x);
    comp.bbox.h = Math.min(comp.bbox.h + PAD * 2, CANVAS - comp.bbox.y);
  }

  // Step 5: Final overlap check after padding — trim padding if it caused overlap
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i].bbox;
      const b = components[j].bbox;
      const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      if (overlapX > 0 && overlapY > 0) {
        // Remove padding from the lower-priority component
        resolveOverlap(components[i], components[j]);
      }
    }
  }

  // Step 6: Final validation — clamp everything inside canvas
  for (const comp of components) {
    comp.bbox.x = Math.max(0, Math.round(comp.bbox.x));
    comp.bbox.y = Math.max(0, Math.round(comp.bbox.y));
    comp.bbox.w = Math.min(Math.round(comp.bbox.w), CANVAS - comp.bbox.x);
    comp.bbox.h = Math.min(Math.round(comp.bbox.h), CANVAS - comp.bbox.y);
  }

  return components.filter(c => c.bbox.w >= 10 && c.bbox.h >= 10);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEBIUS_API_KEY) {
      return NextResponse.json({ success: false, error: 'NEBIUS_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { mimeType, base64Data, knownComponents } = body;
    if (!mimeType || !base64Data) {
      return NextResponse.json({ success: false, error: 'Missing mimeType or base64Data' }, { status: 400 });
    }

    let lastError = '';

    // ── STEP 1: Ask vision model "what components does this logo have?" ───────
    // If knownComponents provided (from blueprint), use them to seed analysis
    let analysis: AnalysisResult = {
      count: 2,
      components: [
        { label: 'Logo Icon', type: 'icon', text: null },
        { label: 'Logo Text', type: 'text', text: null },
      ],
    };

    let skipAnalysis = false;
    if (Array.isArray(knownComponents) && knownComponents.length > 0) {
      const validTypes = ['icon', 'text', 'decoration', 'shape'];
      const mapped: AnalysisComponent[] = knownComponents
        .filter((c: any) => c.label && c.type && validTypes.includes(c.type))
        .map((c: any) => ({
          label: String(c.label),
          type: (c.type === 'shape' ? 'decoration' : c.type) as AnalysisComponent['type'],
          text: c.text ? String(c.text) : null,
          role: null,
          fontDescription: null,
        }));

      if (mapped.length > 0) {
        const textComps = mapped.filter(c => c.type === 'text');
        if (textComps.length >= 1) textComps[0].role = 'brand';
        if (textComps.length >= 2) textComps[1].role = 'tagline';

        analysis = { count: mapped.length, components: mapped };
        skipAnalysis = true;
        console.log('[segment-logo] Using blueprint hints:', mapped.length, 'components');
      }
    }

    for (let attempt = 0; attempt < 3 && !skipAnalysis; attempt++) {
      try {
        // On retry after under-detection, append a stronger instruction
        const prompt = attempt > 0
          ? ANALYSIS_PROMPT + '\n\nIMPORTANT: Your previous analysis found too few components. Look MORE carefully for: separate tagline text, decorative borders/circles/wreaths, divider lines, ornamental patterns. Most logos have 3-5 distinct elements.'
          : ANALYSIS_PROMPT;
        const raw = await callVisionModel(mimeType, base64Data, prompt, 512);
        const cleaned = cleanJSON(raw);

        const objStart = cleaned.indexOf('{');
        const objEnd = cleaned.lastIndexOf('}');
        if (objStart === -1 || objEnd <= objStart) throw new Error('No JSON object in analysis');

        const parsed = JSON.parse(cleaned.slice(objStart, objEnd + 1));
        if (typeof parsed.count !== 'number' || !Array.isArray(parsed.components) || parsed.components.length === 0) {
          throw new Error('Invalid analysis structure');
        }

        const validTypes = ['icon', 'text', 'decoration'];
        const validRoles = ['brand', 'tagline'];
        const validatedComponents: AnalysisComponent[] = parsed.components
          .filter((c: any) => c.label && c.type)
          .map((c: any) => ({
            label: String(c.label).trim(),
            type: validTypes.includes(c.type) ? c.type : 'icon',
            text: c.text ? String(c.text).trim() : null,
            role: (c.role && validRoles.includes(c.role)) ? c.role : null,
            fontDescription: c.fontDescription ? String(c.fontDescription).trim() : null,
          }))
          .slice(0, 6);

        if (validatedComponents.length === 0) throw new Error('No valid components in analysis');

        // Validation: if only 1-2 components found on first attempt, retry — likely missed elements
        if (validatedComponents.length <= 2 && attempt === 0) {
          console.log('[segment-logo] Step 1 attempt 1: only', validatedComponents.length, 'components found — retrying for more thorough analysis');
          // Store as fallback in case retry also returns <= 2
          analysis = { count: validatedComponents.length, components: validatedComponents };
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // Validation: ensure at least one brand text if any text exists
        const hasText = validatedComponents.some(c => c.type === 'text');
        const hasBrand = validatedComponents.some(c => c.role === 'brand');
        if (hasText && !hasBrand) {
          // Auto-assign "brand" to the first text component without a role
          const firstText = validatedComponents.find(c => c.type === 'text' && !c.role);
          if (firstText) firstText.role = 'brand';
        }

        analysis = {
          count: validatedComponents.length,
          components: validatedComponents,
        };

        console.log('[segment-logo] Step 1 OK:', analysis.count, 'components:', analysis.components.map(c => c.label));
        break;
      } catch (e) {
        lastError = `Step 1 attempt ${attempt + 1}: ${e instanceof Error ? e.message : String(e)}`;
        if ((e as any).status === 401 || (e as any).status === 403) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 500));
      }
    }

    // ── STEP 1.5: OCR verification for text components with missing text ──────
    // Skip OCR if blueprint already provided text content
    const textComponentsMissingText = skipAnalysis ? [] : analysis.components.filter(
      c => c.type === 'text' && (!c.text || c.text.trim().length === 0)
    );
    if (textComponentsMissingText.length > 0) {
      try {
        const ocrPrompt = `This logo image contains ${analysis.components.filter(c => c.type === 'text').length} text element(s). Read the EXACT text for each one.

For each text element, provide:
- The exact characters visible (preserve capitalization, punctuation, special characters like &, ., etc.)
- Whether it is the main brand name ("brand") or a tagline/subtitle ("tagline")

Return ONLY a JSON array:
[{"text": "EXACT TEXT HERE", "role": "brand" | "tagline"}]

Order: brand name first, then tagline(s). Read carefully — do NOT guess or use placeholders.`;

        const ocrRaw = await callVisionModel(mimeType, base64Data, ocrPrompt, 512);
        const ocrCleaned = cleanJSON(ocrRaw);
        const ocrParsed = JSON.parse(ocrCleaned);
        const ocrResults: Array<{ text: string; role: string }> = Array.isArray(ocrParsed) ? ocrParsed : [];

        if (ocrResults.length > 0) {
          let ocrIdx = 0;
          for (const comp of analysis.components) {
            if (comp.type === 'text' && (!comp.text || comp.text.trim().length === 0) && ocrIdx < ocrResults.length) {
              comp.text = String(ocrResults[ocrIdx].text || '').trim() || comp.label;
              if (!comp.role && ocrResults[ocrIdx].role) {
                const r = ocrResults[ocrIdx].role;
                comp.role = (r === 'brand' || r === 'tagline') ? r : null;
              }
              ocrIdx++;
            }
          }
          console.log('[segment-logo] Step 1.5 OCR verified:', analysis.components.filter(c => c.type === 'text').map(c => c.text));
        }
      } catch (e) {
        console.warn('[segment-logo] Step 1.5 OCR verification failed:', e instanceof Error ? e.message : String(e));
        // Non-fatal — continue with what we have. Use label as fallback.
        for (const comp of analysis.components) {
          if (comp.type === 'text' && (!comp.text || comp.text.trim().length === 0)) {
            comp.text = comp.label;
          }
        }
      }
    }

    // ── STEP 2: Constrained segmentation with smart retry ─────────────────────
    const segmentationPrompt = buildSegmentationPrompt(analysis);
    let bestResult: NormalizedComponent[] = [];
    let missingComponents: AnalysisComponent[] = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // On retry after detecting missing components, use targeted prompt
        const useTargetedPrompt = attempt > 0 && missingComponents.length > 0 && bestResult.length > 0;
        const promptToUse = useTargetedPrompt
          ? buildMissingComponentPrompt(missingComponents, bestResult)
          : segmentationPrompt;

        console.log('[segment-logo] Step 2 attempt', attempt + 1, useTargetedPrompt ? '(targeted)' : '(full)');

        const raw = await callVisionModel(mimeType, base64Data, promptToUse, 4096);
        console.log('[segment-logo] Step 2 raw (first 500):', raw.slice(0, 500));

        const parsed = extractJSONArray(raw);
        if (!parsed || parsed.length === 0) {
          lastError = `Step 2 attempt ${attempt + 1}: could not extract components from response`;
          if (attempt < 2) await new Promise(r => setTimeout(r, 800));
          continue;
        }

        const normalized: NormalizedComponent[] = [];
        for (const c of parsed) {
          const norm = normalizeComponent(c);
          if (norm) normalized.push(norm);
        }

        if (normalized.length === 0) {
          lastError = `Step 2 attempt ${attempt + 1}: all ${parsed.length} components failed validation`;
          if (attempt < 2) await new Promise(r => setTimeout(r, 800));
          continue;
        }

        // If this was a targeted retry, merge new results with existing best
        let currentResult: NormalizedComponent[];
        if (useTargetedPrompt) {
          currentResult = deduplicateByIoU([...bestResult, ...normalized]);
          console.log('[segment-logo] Step 2 merged:', bestResult.length, '+', normalized.length, '→', currentResult.length);
        } else {
          currentResult = deduplicateByIoU(normalized);
        }

        if (currentResult.length === 0) {
          lastError = `Step 2 attempt ${attempt + 1}: all components removed as duplicates`;
          if (attempt < 2) await new Promise(r => setTimeout(r, 800));
          continue;
        }

        // Check: did we get ALL expected components?
        const returnedTypes = currentResult.map(c => c.type);
        const stillMissing = analysis.components.filter(expected => {
          const idx = returnedTypes.indexOf(expected.type);
          if (idx !== -1) {
            returnedTypes.splice(idx, 1); // consume the match
            return false;
          }
          return true;
        });

        // Keep best result so far
        if (currentResult.length > bestResult.length) {
          bestResult = currentResult;
        }

        if (stillMissing.length === 0 || currentResult.length >= analysis.count) {
          // Got all components — refine and return
          const refined = refineComponents(currentResult);
          console.log('[segment-logo] Step 2 OK:', refined.length, 'components (all found, refined)');
          return NextResponse.json({
            success: true,
            components: refined,
            model: VISION_MODEL,
            analysisUsed: analysis,
          });
        }

        // Components are missing — retry with targeted prompt
        missingComponents = stillMissing;
        console.log('[segment-logo] Step 2 attempt', attempt + 1, '— missing:', stillMissing.map(c => c.label));
        lastError = `Step 2 attempt ${attempt + 1}: missing ${stillMissing.length} components: ${stillMissing.map(c => c.label).join(', ')}`;

      } catch (e) {
        lastError = `Step 2 attempt ${attempt + 1}: ${e instanceof Error ? e.message : String(e)}`;
        if ((e as any).status === 401 || (e as any).status === 403) break;
      }

      if (attempt < 2) await new Promise(r => setTimeout(r, 800));
    }

    // ── FALLBACK: Synthesize bboxes for missing text components ──────────────
    if (bestResult.length > 0 && missingComponents.length > 0) {
      const iconComp = bestResult.find(c => c.type === 'icon');
      if (iconComp) {
        for (const missing of missingComponents) {
          if (missing.type !== 'text') continue;
          // Place text below the icon, spanning similar width
          const synthY = Math.min(950, iconComp.bbox.y + iconComp.bbox.h + 20);
          const synthH = Math.min(1024 - synthY, 80);
          bestResult.push({
            label: missing.label,
            type: 'text',
            text: missing.text || missing.label,
            role: missing.role || undefined,
            fontDescription: missing.fontDescription || undefined,
            bbox: {
              x: Math.max(0, iconComp.bbox.x - 50),
              y: synthY,
              w: Math.min(1024, iconComp.bbox.w + 100),
              h: synthH,
            },
          });
        }
        console.log('[segment-logo] Synthesized bboxes for missing text. Total:', bestResult.length);
      }

      const refined = refineComponents(deduplicateByIoU(bestResult));
      return NextResponse.json({
        success: true,
        components: refined,
        model: VISION_MODEL,
        analysisUsed: analysis,
      });
    }

    // All retries exhausted with zero results
    return NextResponse.json(
      { success: false, error: lastError || 'Segmentation failed after all attempts' },
      { status: 500 }
    );

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
