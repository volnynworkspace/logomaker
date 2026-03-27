/**
 * Blueprint Renderer — converts a logo JSON blueprint into an SVG string
 * and a PNG data-URL (via sharp).
 *
 * Blueprints are designed by a Nebius-hosted LLM and icon components are
 * generated via Flux + potrace vectorization.
 *
 * The blueprint uses a 1024×1024 coordinate space. Each component has an
 * absolute position (x, y) and size (width, height).
 */
import sharp from 'sharp';

// ── Blueprint types ──────────────────────────────────────────────────────────

export interface BlueprintComponent {
  type: 'text' | 'icon' | 'shape' | 'decoration';
  label: string;
  // Position & size in 1024×1024 space
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;       // hex fill
  // Text-specific
  text?: string;
  fontFamily?: string; // Google Font family name
  fontWeight?: string; // "normal" | "bold" | "700" etc.
  fontStyle?: string;  // "normal" | "italic"
  fontSize?: number;   // px at 1024×1024 scale
  // Icon description for AI generation (Flux via Nebius)
  iconDescription?: string;
  // Icon / shape / decoration — SVG data (populated by Flux + potrace)
  svgPath?: string;    // combined "d" attribute
  svgViewBox?: string; // e.g. "0 0 100 100"
  svgContent?: string; // full SVG markup from Flux + potrace
  // Raster fallback — base64 PNG of the generated icon (used by editor when SVG path extraction fails)
  iconBase64?: string;
  svgPaths?: Array<{ path: string; fill: string; viewBox: string }>; // individual paths with colors
}

export interface LogoBlueprint {
  width: number;         // always 1024
  height: number;        // always 1024
  backgroundColor: string;
  components: BlueprintComponent[];
}

// ── Google Font → generic CSS family mapping (for SVG rendering) ─────────────
// Sharp's SVG renderer uses librsvg which doesn't fetch web fonts, so we map
// to universally available CSS generic/system fonts for the PNG render.
// The exact Google Font is still stored in the blueprint for Fabric.js canvas.
const FONT_FALLBACK: Record<string, string> = {
  'Poppins':            "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  'Montserrat':         "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  'Inter':              "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  'Roboto':             "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  'Open Sans':          "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  'Playfair Display':   "Georgia, 'Times New Roman', serif",
  'Libre Baskerville':  "Georgia, 'Times New Roman', serif",
  'Merriweather':       "Georgia, 'Times New Roman', serif",
  'Cinzel':             "Georgia, 'Times New Roman', serif",
  'Dancing Script':     "'Segoe Script', 'Brush Script MT', cursive",
  'Pacifico':           "'Segoe Script', 'Brush Script MT', cursive",
  'Roboto Mono':        "'Courier New', Consolas, monospace",
};

function getSvgFontFamily(googleFont?: string): string {
  if (!googleFont) return "'Segoe UI', Arial, sans-serif";
  return FONT_FALLBACK[googleFont] || `'${googleFont}', 'Segoe UI', Arial, sans-serif`;
}

// ── Escape XML special chars ─────────────────────────────────────────────────
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ── Render blueprint → SVG string ───────────────────────────────────────────
export function blueprintToSvg(bp: LogoBlueprint): string {
  const W = bp.width || 1024;
  const H = bp.height || 1024;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="${escapeXml(bp.backgroundColor || '#FFFFFF')}"/>`,
  ];

  for (const c of bp.components) {
    if (c.type === 'text' && c.text) {
      const family = getSvgFontFamily(c.fontFamily);
      const weight = c.fontWeight || 'normal';
      const style = c.fontStyle || 'normal';
      const size = c.fontSize || Math.round(c.height * 0.75);
      // Anchor text at vertical center of its bbox
      const tx = c.x + c.width / 2;
      const ty = c.y + c.height * 0.72; // approximate baseline offset
      parts.push(
        `<text x="${tx}" y="${ty}" text-anchor="middle" ` +
        `font-family="${escapeXml(family)}" font-size="${size}" ` +
        `font-weight="${weight}" font-style="${style}" ` +
        `fill="${escapeXml(c.color || '#000000')}">${escapeXml(c.text)}</text>`
      );
    } else if (c.svgContent) {
      // Vector SVG — embed the full SVG content within a positioned nested SVG
      // Strip the outer <svg> wrapper and re-wrap with position/size
      const innerContent = c.svgContent
        .replace(/<\?xml[^?]*\?>\s*/g, '') // remove XML declaration
        .replace(/<!DOCTYPE[^>]*>\s*/g, ''); // remove DOCTYPE
      // Extract viewBox from the generated SVG
      const vbMatch = innerContent.match(/viewBox="([^"]+)"/);
      const vb = vbMatch ? vbMatch[1] : '0 0 1024 1024';
      // Extract inner content between <svg> tags
      const innerMatch = innerContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
      const svgInner = innerMatch ? innerMatch[1] : '';
      parts.push(
        `<svg x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" viewBox="${escapeXml(vb)}">` +
        svgInner +
        `</svg>`
      );
    } else if (c.svgPath) {
      // Simple SVG path fallback
      const vb = c.svgViewBox || '0 0 100 100';
      parts.push(
        `<svg x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" viewBox="${escapeXml(vb)}">` +
        `<path d="${escapeXml(c.svgPath)}" fill="${escapeXml(c.color || '#000000')}"/>` +
        `</svg>`
      );
    } else {
      // Fallback: render as a colored rectangle (shape/decoration without path)
      const rx = c.type === 'decoration' ? 8 : 4;
      parts.push(
        `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" ` +
        `rx="${rx}" fill="${escapeXml(c.color || '#CCCCCC')}"/>`
      );
    }
  }

  parts.push('</svg>');
  return parts.join('\n');
}

// ── Render blueprint → PNG data URL ─────────────────────────────────────────
export async function blueprintToPng(bp: LogoBlueprint, size = 1024): Promise<string> {
  const svg = blueprintToSvg(bp);
  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'contain', background: bp.backgroundColor || '#FFFFFF' })
    .png()
    .toBuffer();
  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}
