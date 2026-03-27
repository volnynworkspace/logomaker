/**
 * SVG Sanitizer — prepares SVG markup for Fabric.js consumption.
 *
 * AI SVG generators often use CSS styling that Fabric.js v5
 * cannot properly parse or modify. This sanitizer converts all styling to inline
 * attributes so that Fabric's `set('fill', color)` works correctly.
 *
 * Handles:
 *  - <style> blocks with CSS class rules (.cls-1 { fill: #xxx })
 *  - Inline style attributes (style="fill:#xxx; stroke:#yyy")
 *  - CSS class references (class="cls-1")
 *  - Preserves viewBox, transforms, and structural elements
 *  - Removes elements Fabric can't handle (clipPath, mask, defs with filters)
 */

// CSS properties that map to SVG presentation attributes
const CSS_TO_ATTR: Record<string, string> = {
  'fill': 'fill',
  'stroke': 'stroke',
  'stroke-width': 'stroke-width',
  'stroke-linecap': 'stroke-linecap',
  'stroke-linejoin': 'stroke-linejoin',
  'stroke-dasharray': 'stroke-dasharray',
  'stroke-dashoffset': 'stroke-dashoffset',
  'stroke-miterlimit': 'stroke-miterlimit',
  'stroke-opacity': 'stroke-opacity',
  'fill-opacity': 'fill-opacity',
  'fill-rule': 'fill-rule',
  'clip-rule': 'clip-rule',
  'opacity': 'opacity',
  'font-family': 'font-family',
  'font-size': 'font-size',
  'font-weight': 'font-weight',
  'font-style': 'font-style',
  'text-anchor': 'text-anchor',
  'text-decoration': 'text-decoration',
  'letter-spacing': 'letter-spacing',
  'dominant-baseline': 'dominant-baseline',
  'display': 'display',
  'visibility': 'visibility',
};

/**
 * Parse a CSS style block and return a map of class/selector → properties.
 */
function parseCssBlock(css: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();
  // Match rules like: .cls-1 { fill: #2563EB; stroke: none; }
  // Also handles: .cls-1, .cls-2 { ... } (multiple selectors)
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selectors = match[1].trim().split(/\s*,\s*/);
    const propsStr = match[2].trim();
    const props: Record<string, string> = {};

    // Parse property declarations
    const declRegex = /([a-zA-Z-]+)\s*:\s*([^;]+)/g;
    let declMatch;
    while ((declMatch = declRegex.exec(propsStr)) !== null) {
      const prop = declMatch[1].trim().toLowerCase();
      const value = declMatch[2].trim();
      if (CSS_TO_ATTR[prop]) {
        props[CSS_TO_ATTR[prop]] = value;
      }
    }

    for (const selector of selectors) {
      const clean = selector.trim();
      rules.set(clean, { ...(rules.get(clean) || {}), ...props });
    }
  }

  return rules;
}

/**
 * Convert inline style="..." to individual attributes.
 * Removes the style attribute after extracting.
 */
function inlineStyleToAttributes(styleStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const declRegex = /([a-zA-Z-]+)\s*:\s*([^;]+)/g;
  let match;
  while ((match = declRegex.exec(styleStr)) !== null) {
    const prop = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (CSS_TO_ATTR[prop]) {
      attrs[CSS_TO_ATTR[prop]] = value;
    }
  }
  return attrs;
}

/**
 * Sanitize SVG markup for Fabric.js compatibility.
 *
 * 1. Extracts and removes <style> blocks
 * 2. Applies CSS class rules as inline attributes
 * 3. Converts style="..." to individual attributes
 * 4. Removes class="..." references
 * 5. Removes unsupported elements (clipPath references, masks)
 * 6. Ensures all shape elements have explicit fill attributes
 */
export function sanitizeSvgForFabric(svgContent: string): string {
  let svg = svgContent;

  // Step 0: Remove XML declaration and DOCTYPE
  svg = svg.replace(/<\?xml[^?]*\?>\s*/g, '');
  svg = svg.replace(/<!DOCTYPE[^>]*>\s*/g, '');

  // Step 1: Extract all <style> blocks and parse CSS rules
  const cssRules = new Map<string, Record<string, string>>();
  const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleBlockRegex.exec(svg)) !== null) {
    const parsed = parseCssBlock(styleMatch[1]);
    for (const [selector, props] of parsed) {
      cssRules.set(selector, { ...(cssRules.get(selector) || {}), ...props });
    }
  }
  // Remove <style> blocks
  svg = svg.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Step 2: Apply CSS class rules to elements
  // Find elements with class="..." and apply matching CSS properties as attributes
  if (cssRules.size > 0) {
    svg = svg.replace(/<(\w+)([^>]*)\bclass="([^"]*)"([^>]*?)(\/?)\s*>/g,
      (fullMatch, tagName, beforeClass, classNames, afterClass, selfClose) => {
        const classes = classNames.trim().split(/\s+/);
        let newAttrs = '';

        for (const cls of classes) {
          const selector = `.${cls}`;
          const props = cssRules.get(selector);
          if (props) {
            for (const [attr, value] of Object.entries(props)) {
              // Only add if the attribute isn't already set inline
              const attrRegex = new RegExp(`\\b${attr}="`, 'i');
              if (!attrRegex.test(beforeClass + afterClass)) {
                newAttrs += ` ${attr}="${value}"`;
              }
            }
          }
        }

        return `<${tagName}${beforeClass}${afterClass}${newAttrs}${selfClose}>`;
      }
    );
  }

  // Step 3: Convert inline style="..." attributes to individual SVG attributes
  svg = svg.replace(/(<\w+[^>]*?)\bstyle="([^"]*)"([^>]*?)(\/?\s*>)/g,
    (fullMatch, before, styleStr, after, close) => {
      const attrs = inlineStyleToAttributes(styleStr);
      let newAttrs = '';

      for (const [attr, value] of Object.entries(attrs)) {
        // Only add if not already set as an attribute
        const attrRegex = new RegExp(`\\b${attr}="`, 'i');
        if (!attrRegex.test(before + after)) {
          newAttrs += ` ${attr}="${value}"`;
        }
      }

      return `${before}${after}${newAttrs}${close}`;
    }
  );

  // Step 4: Remove class="..." attributes (no longer needed)
  svg = svg.replace(/\s+class="[^"]*"/g, '');

  // Step 5: Remove clip-path references that Fabric can't handle
  svg = svg.replace(/\s+clip-path="[^"]*"/g, '');
  svg = svg.replace(/\s+mask="[^"]*"/g, '');

  // Step 6: Remove <clipPath>, <mask>, and <filter> elements from <defs>
  svg = svg.replace(/<clipPath[^>]*>[\s\S]*?<\/clipPath>/gi, '');
  svg = svg.replace(/<mask[^>]*>[\s\S]*?<\/mask>/gi, '');
  svg = svg.replace(/<filter[^>]*>[\s\S]*?<\/filter>/gi, '');

  // Step 7: Remove empty <defs> blocks
  svg = svg.replace(/<defs\s*>\s*<\/defs>/gi, '');
  svg = svg.replace(/<defs\s*\/>/gi, '');

  // Step 8: Ensure all visible shape elements have an explicit fill attribute
  // If a path/circle/rect/polygon has no fill attribute, Fabric defaults to black
  // which is usually correct, but we make it explicit for reliable set('fill') later
  const shapeElements = ['path', 'circle', 'rect', 'polygon', 'polyline', 'ellipse', 'line'];
  for (const tag of shapeElements) {
    const regex = new RegExp(`(<${tag}\\b)([^>]*?)(\\/?\\s*>)`, 'gi');
    svg = svg.replace(regex, (full, open, attrs, close) => {
      if (!/\bfill="/.test(attrs)) {
        // No fill attribute — check if it has fill:none via stroke-only styling
        if (/\bstroke="/.test(attrs) && !/\bfill/.test(attrs)) {
          return `${open}${attrs} fill="none"${close}`;
        }
        // Default: add explicit black fill (SVG spec default)
        return `${open}${attrs} fill="#000000"${close}`;
      }
      return full;
    });
  }

  // Step 9: Convert fill="none" display="none" and visibility="hidden" — keep them
  // (these are intentional and should not be overridden)

  return svg.trim();
}
