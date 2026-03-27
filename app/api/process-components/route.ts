import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const potrace = require('potrace');

const NEBIUS_VISION_MODEL = 'Qwen/Qwen2.5-VL-72B-Instruct';

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

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComponentInput {
  label: string;
  type: string;
  text?: string;
  role?: string;
  fontDescription?: string;
  bbox: { x: number; y: number; w: number; h: number };
  color?: string;
}

interface FontInfo {
  text: string;
  fontStyle: string;
  googleFont: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
}

interface ProcessedComponent {
  label: string;
  type: string;
  text?: string;
  role?: string;
  bbox: { x: number; y: number; w: number; h: number };
  color?: string;
  croppedImage: string;
  fontInfo?: FontInfo;
  svgPath?: string;
  svgViewBox?: string;
}

// ─── Google Font mapping ─────────────────────────────────────────────────────
const FONT_STYLE_MAP: Record<string, string> = {
  'serif':        'Playfair Display',
  'sans-serif':   'Poppins',
  'script':       'Dancing Script',
  'decorative':   'Cinzel',
  'modern':       'Montserrat',
  'vintage':      'Libre Baskerville',
  'monospace':    'Roboto Mono',
};

// ─── Geometry utilities ──────────────────────────────────────────────────────
type Bbox = { x: number; y: number; w: number; h: number };

function boxesOverlap(a: Bbox, b: Bbox): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

// Priority: icon > brand text > tagline text > decoration
// Icon is the primary visual — text must NEVER overlap it
function layoutPriority(type: string, role?: string): number {
  if (type === 'icon') return 4;
  if (type === 'text' && role === 'brand') return 3;
  if (type === 'text') return 2; // tagline or other text
  return 1; // decoration
}

// ─── Priority-aware Overlap Resolver ─────────────────────────────────────────
// Higher-priority component keeps its bbox; lower-priority gets pushed/shrunk.
function resolveOverlaps(
  bboxes: Bbox[],
  types: string[],
  roles: (string | undefined)[]
): Bbox[] {
  const resolved = bboxes.map(b => ({ ...b }));

  // Sort indices by priority descending
  const order = resolved.map((_, i) => i);
  order.sort((a, b) => {
    const pd = layoutPriority(types[b], roles[b]) - layoutPriority(types[a], roles[a]);
    return pd !== 0 ? pd : resolved[a].y - resolved[b].y;
  });

  // Resolve all pairwise overlaps — higher-priority keeps, lower-priority adjusts
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const ai = order[i]; // higher priority (keeper)
      const bi = order[j]; // lower priority (adjusts)
      const a = resolved[ai];
      const b = resolved[bi];

      if (!boxesOverlap(a, b)) continue;

      const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

      // Choose axis with less overlap to minimize displacement
      if (overlapY <= overlapX) {
        // Vertical: push b away from a
        const bCenterY = b.y + b.h / 2;
        const aCenterY = a.y + a.h / 2;
        if (bCenterY <= aCenterY) {
          // b is above — clip bottom
          b.h = Math.max(10, a.y - b.y);
        } else {
          // b is below — push top down
          const aBottom = a.y + a.h;
          const lost = aBottom - b.y;
          b.y = aBottom;
          b.h = Math.max(10, b.h - lost);
        }
      } else {
        // Horizontal: push b sideways
        const bCenterX = b.x + b.w / 2;
        const aCenterX = a.x + a.w / 2;
        if (bCenterX <= aCenterX) {
          b.w = Math.max(10, a.x - b.x);
        } else {
          const aRight = a.x + a.w;
          const lost = aRight - b.x;
          b.x = aRight;
          b.w = Math.max(10, b.w - lost);
        }
      }

      console.log(`[resolveOverlaps] Fixed overlap: "${types[ai]}" (pri ${layoutPriority(types[ai], roles[ai])}) keeps, "${types[bi]}" adjusts`);
    }
  }

  return resolved;
}

// ─── Background removal via edge flood-fill ───────────────────────────────────
function removeBackground(
  pixels: Buffer,
  width: number,
  height: number,
  tolerance: number = 22
): Buffer {
  const data = Buffer.from(pixels);

  const getPixel = (x: number, y: number): [number, number, number] => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };

  // Sample background from corners + edge midpoints, use median
  const samples = [
    getPixel(0, 0), getPixel(width - 1, 0),
    getPixel(0, height - 1), getPixel(width - 1, height - 1),
    getPixel(Math.floor(width / 2), 0),
    getPixel(Math.floor(width / 2), height - 1),
    getPixel(0, Math.floor(height / 2)),
    getPixel(width - 1, Math.floor(height / 2)),
  ];
  samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const mid = Math.floor(samples.length / 2);
  const bgR = samples[mid][0], bgG = samples[mid][1], bgB = samples[mid][2];

  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);

  const matchesBg = (i: number): boolean => {
    const dr = data[i] - bgR, dg = data[i + 1] - bgG, db = data[i + 2] - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db) < tolerance;
  };

  // Seed flood-fill from all 4 edges
  const queue: number[] = [];
  for (let x = 0; x < width; x++) {
    queue.push(x);
    queue.push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    queue.push(y * width);
    queue.push(y * width + (width - 1));
  }

  while (queue.length > 0) {
    const idx = queue.pop()!;
    if (idx < 0 || idx >= totalPixels || visited[idx]) continue;
    visited[idx] = 1;
    const pi = idx * 4;
    if (!matchesBg(pi)) continue;
    data[pi + 3] = 0;
    const x = idx % width, y = Math.floor(idx / width);
    if (x > 0) queue.push(idx - 1);
    if (x < width - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - width);
    if (y < height - 1) queue.push(idx + width);
  }

  return data;
}

// ─── Pixel-level content bounds detection ────────────────────────────────────
// After bg-removal, scan the RGBA buffer to find the tight bounding box of
// all non-transparent pixels. Returns {top, left, bottom, right} in local coords.
function findContentBounds(
  pixels: Buffer,
  width: number,
  height: number
): { top: number; left: number; bottom: number; right: number } | null {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 20) { // non-transparent
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return null;
  return { top: minY, left: minX, bottom: maxY, right: maxX };
}

// ─── Content-aware boundary expansion ────────────────────────────────────────
// Checks if content touches the edge of the crop region. If so, the bbox was
// too tight and clipped the component. Expands outward adaptively until content
// no longer touches the edge. Returns the adjusted bbox in image coordinates.
async function expandIfContentClipped(
  imageBuffer: Buffer,
  bbox: Bbox,
  imgW: number,
  imgH: number,
  bgTolerance: number,
  neighborBboxes: Bbox[],
  maxExpansionPx: number = 80,
): Promise<Bbox> {
  const EDGE_THRESHOLD = 3; // content within this many px of edge = clipped

  // Helper: check if content touches edge of a crop
  async function checkEdgeContact(left: number, top: number, width: number, height: number) {
    if (width <= 4 || height <= 4) return { top: false, bottom: false, left: false, right: false };

    const cropped = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .ensureAlpha()
      .raw()
      .toBuffer();

    const bgRemoved = removeBackground(cropped, width, height, bgTolerance);

    let touchesTop = false, touchesBottom = false, touchesLeft = false, touchesRight = false;

    for (let x = 0; x < width; x++) {
      // Check top rows
      for (let row = 0; row < EDGE_THRESHOLD && row < height; row++) {
        if (bgRemoved[(row * width + x) * 4 + 3] > 20) { touchesTop = true; break; }
      }
      // Check bottom rows
      for (let row = height - 1; row >= height - EDGE_THRESHOLD && row >= 0; row--) {
        if (bgRemoved[(row * width + x) * 4 + 3] > 20) { touchesBottom = true; break; }
      }
    }

    for (let y = 0; y < height; y++) {
      // Check left columns
      for (let col = 0; col < EDGE_THRESHOLD && col < width; col++) {
        if (bgRemoved[(y * width + col) * 4 + 3] > 20) { touchesLeft = true; break; }
      }
      // Check right columns
      for (let col = width - 1; col >= width - EDGE_THRESHOLD && col >= 0; col--) {
        if (bgRemoved[(y * width + col) * 4 + 3] > 20) { touchesRight = true; break; }
      }
    }

    return { top: touchesTop, bottom: touchesBottom, left: touchesLeft, right: touchesRight };
  }

  // Calculate max expansion in each direction (limited by neighbors and image bounds)
  function maxExpand(direction: 'top' | 'bottom' | 'left' | 'right'): number {
    let limit = maxExpansionPx;

    for (const other of neighborBboxes) {
      if (other === bbox) continue;
      switch (direction) {
        case 'top':
          if (other.y + other.h <= bbox.y) {
            limit = Math.min(limit, Math.max(2, Math.floor((bbox.y - (other.y + other.h)) / 2)));
          }
          break;
        case 'bottom':
          if (other.y >= bbox.y + bbox.h) {
            limit = Math.min(limit, Math.max(2, Math.floor((other.y - (bbox.y + bbox.h)) / 2)));
          }
          break;
        case 'left':
          if (other.x + other.w <= bbox.x) {
            limit = Math.min(limit, Math.max(2, Math.floor((bbox.x - (other.x + other.w)) / 2)));
          }
          break;
        case 'right':
          if (other.x >= bbox.x + bbox.w) {
            limit = Math.min(limit, Math.max(2, Math.floor((other.x - (bbox.x + bbox.w)) / 2)));
          }
          break;
      }
    }

    // Also limit by image bounds
    switch (direction) {
      case 'top': return Math.min(limit, bbox.y);
      case 'bottom': return Math.min(limit, imgH - (bbox.y + bbox.h));
      case 'left': return Math.min(limit, bbox.x);
      case 'right': return Math.min(limit, imgW - (bbox.x + bbox.w));
    }
  }

  // Iteratively expand edges where content is clipped (max 3 iterations)
  const expanded = { ...bbox };
  for (let iter = 0; iter < 3; iter++) {
    const left = Math.max(0, expanded.x);
    const top = Math.max(0, expanded.y);
    const width = Math.min(expanded.w, imgW - left);
    const height = Math.min(expanded.h, imgH - top);

    try {
      const contact = await checkEdgeContact(left, top, width, height);
      let didExpand = false;
      const STEP = Math.max(15, Math.round(maxExpansionPx / 3));

      if (contact.top) {
        const expand = Math.min(STEP, maxExpand('top'));
        if (expand > 2) { expanded.y -= expand; expanded.h += expand; didExpand = true; }
      }
      if (contact.bottom) {
        const expand = Math.min(STEP, maxExpand('bottom'));
        if (expand > 2) { expanded.h += expand; didExpand = true; }
      }
      if (contact.left) {
        const expand = Math.min(STEP, maxExpand('left'));
        if (expand > 2) { expanded.x -= expand; expanded.w += expand; didExpand = true; }
      }
      if (contact.right) {
        const expand = Math.min(STEP, maxExpand('right'));
        if (expand > 2) { expanded.w += expand; didExpand = true; }
      }

      if (!didExpand) break;
      console.log(`[content-aware] Iteration ${iter + 1}: expanded to (${expanded.x},${expanded.y}) ${expanded.w}x${expanded.h}`);
    } catch {
      break; // Sharp error — stop expanding
    }
  }

  // Final clamp
  expanded.x = Math.max(0, expanded.x);
  expanded.y = Math.max(0, expanded.y);
  expanded.w = Math.min(expanded.w, imgW - expanded.x);
  expanded.h = Math.min(expanded.h, imgH - expanded.y);

  return expanded;
}

// ─── Final validation: ensure no overlap, all inside image, add margins ──────
function validateAndFixBboxes(
  bboxes: Bbox[],
  types: string[],
  roles: (string | undefined)[],
  imgW: number,
  imgH: number
): Bbox[] {
  const fixed = bboxes.map(b => ({ ...b }));

  // Step 1: Add type-specific safe margins
  const ICON_PAD = 5;
  const TEXT_PAD = 10;
  for (let i = 0; i < fixed.length; i++) {
    const pad = types[i] === 'text' ? TEXT_PAD : ICON_PAD;
    fixed[i].x = Math.max(0, fixed[i].x - pad);
    fixed[i].y = Math.max(0, fixed[i].y - pad);
    fixed[i].w = Math.min(fixed[i].w + pad * 2, imgW - fixed[i].x);
    fixed[i].h = Math.min(fixed[i].h + pad * 2, imgH - fixed[i].y);
  }

  // Step 2: Clamp to image bounds
  for (const b of fixed) {
    b.x = Math.max(0, b.x);
    b.y = Math.max(0, b.y);
    b.w = Math.min(b.w, imgW - b.x);
    b.h = Math.min(b.h, imgH - b.y);
  }

  // Step 3: Re-resolve any overlaps introduced by padding
  const order = fixed.map((_, i) => i);
  order.sort((a, b) => layoutPriority(types[b], roles[b]) - layoutPriority(types[a], roles[a]));

  for (let pass = 0; pass < 3; pass++) {
    let anyFixed = false;
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const a = fixed[order[i]]; // higher priority
        const b = fixed[order[j]]; // lower priority

        if (!boxesOverlap(a, b)) continue;
        anyFixed = true;

        // Push b away from a on the axis with less overlap
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);

        if (overlapY <= overlapX) {
          if (b.y + b.h / 2 <= a.y + a.h / 2) {
            b.h = Math.max(10, a.y - b.y);
          } else {
            const aBottom = a.y + a.h;
            const lost = aBottom - b.y;
            b.y = aBottom;
            b.h = Math.max(10, b.h - lost);
          }
        } else {
          if (b.x + b.w / 2 <= a.x + a.w / 2) {
            b.w = Math.max(10, a.x - b.x);
          } else {
            const aRight = a.x + a.w;
            const lost = aRight - b.x;
            b.x = aRight;
            b.w = Math.max(10, b.w - lost);
          }
        }
      }
    }
    if (!anyFixed) break;
  }

  // Step 4: Final clamp
  for (const b of fixed) {
    b.x = Math.max(0, Math.round(b.x));
    b.y = Math.max(0, Math.round(b.y));
    b.w = Math.min(Math.round(b.w), imgW - b.x);
    b.h = Math.min(Math.round(b.h), imgH - b.y);
  }

  return fixed;
}

// ─── Batch font detection via Nebius Vision ─────────────────────────────────
async function detectFontForComponent(
  base64Png: string,
): Promise<FontInfo | null> {
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
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Png}` } },
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
    return null;
  }
}

async function batchDetectFonts(
  textComponents: Array<{ index: number; base64: string; existingText?: string }>,
): Promise<Map<number, FontInfo>> {
  const results = new Map<number, FontInfo>();
  if (textComponents.length === 0) return results;

  const detections = await Promise.all(
    textComponents.map(async (tc) => {
      const info = await detectFontForComponent(tc.base64);
      return { index: tc.index, info, existingText: tc.existingText };
    })
  );

  for (const { index, info, existingText } of detections) {
    if (info) {
      // Use the text from segmentation if font detection returned empty
      if ((!info.text || info.text.trim().length === 0) && existingText) {
        info.text = existingText;
      }
      results.set(index, info);
    }
  }

  return results;
}

// ─── Icon vectorization via potrace ──────────────────────────────────────────
async function vectorizeIcon(pngBuffer: Buffer): Promise<{ path: string; viewBox: string } | null> {
  return new Promise((resolve) => {
    potrace.trace(pngBuffer, {
      threshold: 128,
      optTolerance: 0.4,
      turdSize: 2,
    }, (err: Error | null, svg: string) => {
      if (err || !svg) { resolve(null); return; }

      // Extract path data from SVG
      const pathMatch = svg.match(/<path[^>]*\sd="([^"]+)"/);
      if (!pathMatch) { resolve(null); return; }

      // Extract viewBox
      const vbMatch = svg.match(/viewBox="([^"]+)"/);
      const viewBox = vbMatch ? vbMatch[1] : '0 0 100 100';

      resolve({ path: pathMatch[1], viewBox });
    });
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, components } = body as {
      imageBase64: string;
      mimeType: string;
      components: ComponentInput[];
    };

    if (!imageBase64 || !components?.length) {
      return NextResponse.json(
        { success: false, error: 'Missing imageBase64 or components' },
        { status: 400 }
      );
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const metadata = await sharp(imageBuffer).metadata();
    const imgW = metadata.width!;
    const imgH = metadata.height!;

    // Scale bboxes from 1024x1024 coordinate space to actual pixels
    const bboxScaleX = imgW / 1024;
    const bboxScaleY = imgH / 1024;

    const isJpeg = mimeType === 'image/jpeg' || mimeType === 'image/jpg';
    const bgTolerance = isJpeg ? 28 : 22;

    // ── Scale bboxes to image pixels ──
    const scaledBboxes = components.map(c => ({
      x: Math.round(c.bbox.x * bboxScaleX),
      y: Math.round(c.bbox.y * bboxScaleY),
      w: Math.round(c.bbox.w * bboxScaleX),
      h: Math.round(c.bbox.h * bboxScaleY),
    }));

    // ── Step 1: Resolve vertical overlaps ──
    const resolved = resolveOverlaps(scaledBboxes, components.map(c => c.type), components.map(c => c.role));

    console.log('[process-components] Image:', imgW, 'x', imgH,
      '| Components:', components.map(c => c.label).join(', '));

    // ── Step 2: Content-aware expansion + processing ──
    // First, expand any bboxes where content touches the crop edge
    const expanded = await Promise.all(
      resolved.map((bbox, ci) =>
        expandIfContentClipped(imageBuffer, bbox, imgW, imgH, bgTolerance, resolved.filter((_, j) => j !== ci))
      )
    );

    // ── Step 3: Process each component in parallel ──
    const results = await Promise.all(
      components.map(async (comp, ci) => {
        const bbox = expanded[ci];
        try {
          const left = Math.max(0, bbox.x);
          const top = Math.max(0, bbox.y);
          const width = Math.min(bbox.w, imgW - left);
          const height = Math.min(bbox.h, imgH - top);

          if (width <= 4 || height <= 4) return null;

          console.log(`[process-components] "${comp.label}": extract (${left},${top}) ${width}x${height}`);

          // ── Crop ──
          const cropped = await sharp(imageBuffer)
            .extract({ left, top, width, height })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

          // ── Remove background ──
          const bgRemoved = removeBackground(cropped.data, width, height, bgTolerance);

          // ── Pixel-level content bounds detection ──
          // Use actual opaque pixel bounds for a tighter, more accurate bbox
          const contentBounds = findContentBounds(bgRemoved, width, height);

          let finalPng: Buffer;
          let finalBbox = { x: left, y: top, w: width, h: height };

          if (contentBounds) {
            // Content found — crop to exact pixel bounds with small padding
            const PAD = 4;
            const cx = Math.max(0, contentBounds.left - PAD);
            const cy = Math.max(0, contentBounds.top - PAD);
            const cw = Math.min(width - cx, (contentBounds.right - contentBounds.left + 1) + PAD * 2);
            const ch = Math.min(height - cy, (contentBounds.bottom - contentBounds.top + 1) + PAD * 2);

            // Convert bg-removed buffer to PNG, then extract tight region
            const rawPng = await sharp(bgRemoved, { raw: { width, height, channels: 4 } })
              .png()
              .toBuffer();

            try {
              const tightResult = await sharp(rawPng)
                .extract({ left: cx, top: cy, width: cw, height: ch })
                .toBuffer({ resolveWithObject: true });

              finalPng = tightResult.data;
              finalBbox = {
                x: left + cx,
                y: top + cy,
                w: tightResult.info.width,
                h: tightResult.info.height,
              };
            } catch {
              // Extract failed — fall back to sharp trim
              try {
                const trimResult = await sharp(rawPng)
                  .trim()
                  .toBuffer({ resolveWithObject: true });
                finalPng = trimResult.data;
                const ti = trimResult.info;
                const trimLeft2 = ti.trimOffsetLeft !== undefined ? -ti.trimOffsetLeft : 0;
                const trimTop2 = ti.trimOffsetTop !== undefined ? -ti.trimOffsetTop : 0;
                finalBbox = { x: left + trimLeft2, y: top + trimTop2, w: ti.width, h: ti.height };
              } catch {
                finalPng = rawPng;
              }
            }
          } else {
            // No visible content — use sharp trim as fallback
            const rawPng = await sharp(bgRemoved, { raw: { width, height, channels: 4 } })
              .png()
              .toBuffer();

            try {
              const trimResult = await sharp(rawPng)
                .trim()
                .toBuffer({ resolveWithObject: true });
              finalPng = trimResult.data;
              const ti = trimResult.info;
              const trimLeft2 = ti.trimOffsetLeft !== undefined ? -ti.trimOffsetLeft : 0;
              const trimTop2 = ti.trimOffsetTop !== undefined ? -ti.trimOffsetTop : 0;
              finalBbox = { x: left + trimLeft2, y: top + trimTop2, w: ti.width, h: ti.height };
            } catch {
              console.log(`[process-components] "${comp.label}": no content found, using raw crop`);
              finalPng = rawPng;
            }
          }

          console.log(`[process-components] "${comp.label}": final (${finalBbox.x},${finalBbox.y}) ${finalBbox.w}x${finalBbox.h}`);

          return {
            label: comp.label,
            type: comp.type,
            text: comp.text,
            role: comp.role,
            color: comp.color,
            bbox: finalBbox,
            croppedImage: `data:image/png;base64,${finalPng.toString('base64')}`,
            _finalPng: finalPng, // temp: kept for post-processing, stripped before response
          } as ProcessedComponent & { _finalPng: Buffer };
        } catch (e) {
          console.error(`[process-components] Failed "${comp.label}":`, e);
          return null;
        }
      })
    );

    const processed = results.filter((r): r is ProcessedComponent & { _finalPng: Buffer } => r !== null);

    if (processed.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All components failed processing' },
        { status: 500 }
      );
    }

    // ── Step 3: Batch font detection for text components ──
    if (process.env.NEBIUS_API_KEY) {
      const textComponents = processed
        .map((comp, idx) => ({ index: idx, comp }))
        .filter(({ comp }) => comp.type === 'text')
        .map(({ index, comp }) => ({
          index,
          base64: (comp as any)._finalPng.toString('base64'),
          existingText: comp.text,
        }));

      if (textComponents.length > 0) {
        try {
          const fontMap = await batchDetectFonts(textComponents);
          fontMap.forEach((fontInfo, idx) => {
            processed[idx].fontInfo = fontInfo;
            // If segmentation text was missing but font detection found it, use it
            if (fontInfo.text && (!processed[idx].text || processed[idx].text!.trim().length === 0)) {
              processed[idx].text = fontInfo.text;
            }
          });
          console.log('[process-components] Font detection done for', fontMap.size, 'text components');
        } catch (e) {
          console.warn('[process-components] Batch font detection failed:', e);
        }
      }
    }

    // ── Step 4: Vectorize icon components ──
    const iconVectorizations = await Promise.all(
      processed.map(async (comp) => {
        if (comp.type !== 'icon' && comp.type !== 'decoration') return null;
        try {
          const result = await vectorizeIcon((comp as any)._finalPng);
          return result;
        } catch (e) {
          console.warn(`[process-components] Vectorization failed for "${comp.label}":`, e);
          return null;
        }
      })
    );

    for (let i = 0; i < processed.length; i++) {
      if (iconVectorizations[i]) {
        processed[i].svgPath = iconVectorizations[i]!.path;
        processed[i].svgViewBox = iconVectorizations[i]!.viewBox;
      }
    }
    console.log('[process-components] Vectorized', iconVectorizations.filter(Boolean).length, 'icon components');

    // ── Step 5: Final validation — ensure no overlap, all inside bounds ──
    const finalBboxes = processed.map(c => ({ ...c.bbox }));
    const finalTypes = processed.map(c => c.type);
    const finalRoles = processed.map(c => c.role);
    const validatedBboxes = validateAndFixBboxes(finalBboxes, finalTypes, finalRoles, imgW, imgH);
    for (let i = 0; i < processed.length; i++) {
      processed[i].bbox = validatedBboxes[i];
    }
    console.log('[process-components] Final validation pass complete');

    // ── Clean up temp fields and return ──
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cleanedResults: ProcessedComponent[] = processed.map(({ _finalPng, ...rest }: any) => rest);

    console.log('[process-components] Done:', cleanedResults.length, 'components');
    return NextResponse.json({ success: true, components: cleanedResults });
  } catch (err) {
    console.error('[process-components] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
