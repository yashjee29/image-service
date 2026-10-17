import { RenderError } from '../../utils/errors.js';

const DISALLOWED_SVG_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /\bon\w+\s*=/gi, // event handlers: onload=, onerror=, etc.
  /<!ENTITY/gi, // XML entity expansion (XXE)
  /<!DOCTYPE/gi,
  /javascript:/gi,
  /<foreignObject\b/gi,
];

export function validateSvgSecurity(svgString: string): void {
  for (const pattern of DISALLOWED_SVG_PATTERNS) {
    if (pattern.test(svgString)) {
      throw new RenderError('SVG contains disallowed elements or attributes that violate security policy');
    }
  }

  if (!svgString.includes('<svg') || !svgString.includes('</svg>')) {
    throw new RenderError('Invalid SVG structure: missing <svg> root element');
  }
}
