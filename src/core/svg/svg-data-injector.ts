import { escapeXmlText } from './svg-escaping.js';

export interface PlaceholderReplacements {
  [key: string]: string | number;
}

export function injectPlaceholders(
  templateContent: string,
  replacements: PlaceholderReplacements,
  escape = true
): string {
  let result = templateContent;

  for (const [key, rawValue] of Object.entries(replacements)) {
    const val = escape ? escapeXmlText(rawValue) : String(rawValue);
    // Replace {{key}} or {{ key }}
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, val);
  }

  return result;
}

export function replaceCommentBlock(
  svgString: string,
  startComment: string,
  endComment: string,
  replacement: string
): string {
  const startIndex = svgString.indexOf(startComment);
  if (startIndex === -1) return svgString;

  const endIndex = svgString.indexOf(endComment, startIndex);
  if (endIndex === -1) return svgString;

  const before = svgString.substring(0, startIndex);
  const after = svgString.substring(endIndex + endComment.length);

  return before + replacement + after;
}
