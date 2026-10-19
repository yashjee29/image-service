export function escapeXmlText(str: unknown): string {
  if (str === null || str === undefined) return '';
  const text = String(str);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeXmlAttribute(str: unknown): string {
  if (str === null || str === undefined) return '';
  const text = String(str);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Strips unsupported emojis, pictorial symbols, non-renderable glyphs,
 * and normalizes fancy Unicode pseudo-fonts (Mathematical alphanumeric, fullwidth, circled)
 * into clean standard text that fonts can reliably render without generating missing glyph (.notdef / ☒) boxes.
 */
export function sanitizeDisplayText(raw: unknown, fallback = ''): string {
  if (raw === null || raw === undefined) return fallback;
  const str = String(raw).normalize('NFKD');
  const cleaned = str
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\uFE00-\uFE0F\u200B-\u200D\uFEFF\uE000-\uF8FF\u0000-\u001F\u007F-\u009F]|\u20E3/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 0 ? cleaned : fallback;
}
