/**
 * Nebius Icon Generation — generates SVG vector icons via Flux image generation
 * and potrace vectorization.
 *
 * Replaces the previous Recraft AI integration. All generation now routes
 * through Nebius (Flux models for images, potrace for vectorization).
 */

export interface IconResult {
  svgContent: string;   // Full SVG markup
  svgPath: string;      // Combined "d" attribute
  svgViewBox: string;   // e.g. "0 0 512 512"
  imageUrl: string;     // Original raster URL from Flux
}

/**
 * Extract individual SVG paths from an SVG document.
 * Returns array of { path, fill, viewBox } for each path element.
 */
export function extractSvgPaths(svgContent: string): Array<{
  path: string;
  fill: string;
  viewBox: string;
}> {
  // Extract viewBox from root SVG
  const vbMatch = svgContent.match(/viewBox="([^"]+)"/);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 1024 1024';

  // Extract all path elements with their fill colors
  const paths: Array<{ path: string; fill: string; viewBox: string }> = [];
  const pathRegex = /<path[^>]*?\sd="([^"]+)"[^>]*?(?:\sfill="([^"]*)")?[^>]*?\/?>/g;
  const pathRegex2 = /<path[^>]*?(?:\sfill="([^"]*)")?[^>]*?\sd="([^"]+)"[^>]*?\/?>/g;

  let match;
  // Try pattern 1: d before fill
  while ((match = pathRegex.exec(svgContent)) !== null) {
    paths.push({
      path: match[1],
      fill: match[2] || '#000000',
      viewBox,
    });
  }

  // If no paths found with pattern 1, try pattern 2: fill before d
  if (paths.length === 0) {
    while ((match = pathRegex2.exec(svgContent)) !== null) {
      paths.push({
        path: match[2],
        fill: match[1] || '#000000',
        viewBox,
      });
    }
  }

  // Fallback: extract any path d attribute
  if (paths.length === 0) {
    const fallbackRegex = /\sd="([^"]{10,})"/g;
    while ((match = fallbackRegex.exec(svgContent)) !== null) {
      paths.push({
        path: match[1],
        fill: '#000000',
        viewBox,
      });
    }
  }

  return paths;
}
