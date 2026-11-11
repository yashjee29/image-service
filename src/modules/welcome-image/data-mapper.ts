import { escapeXmlText, sanitizeDisplayText } from '../../core/svg/svg-escaping.js';
import { buildSvgImageTag } from '../../core/images/image-injector.js';
import { welcomeImageConfig } from './config.js';
import type { WelcomeImageInput } from './schema.js';

/**
 * Precise character advance widths for Poppins ExtraBold (800) normalized to 1 unit of font-size.
 */
export const POPPINS_800_ADVANCES: Record<string, number> = {
  '0': 0.645, '1': 0.372, '2': 0.558, '3': 0.596, '4': 0.678,
  '5': 0.642, '6': 0.622, '7': 0.513, '8': 0.639, '9': 0.594,
  'a': 0.666, 'b': 0.669, 'c': 0.596, 'd': 0.666, 'e': 0.605,
  'f': 0.363, 'g': 0.666, 'h': 0.672, 'i': 0.295, 'j': 0.294,
  'k': 0.638, 'l': 0.294, 'm': 1.053, 'n': 0.672, 'o': 0.625,
  'p': 0.669, 'q': 0.666, 'r': 0.448, 's': 0.555, 't': 0.409,
  'u': 0.672, 'v': 0.642, 'w': 0.876, 'x': 0.619, 'y': 0.647, 'z': 0.496,
  'A': 0.746, 'B': 0.659, 'C': 0.746, 'D': 0.723, 'E': 0.535,
  'F': 0.550, 'G': 0.745, 'H': 0.729, 'I': 0.294, 'J': 0.569,
  'K': 0.716, 'L': 0.480, 'M': 0.921, 'N': 0.751, 'O': 0.775,
  'P': 0.625, 'Q': 0.778, 'R': 0.649, 'S': 0.608, 'T': 0.594,
  'U': 0.698, 'V': 0.738, 'W': 1.065, 'X': 0.729, 'Y': 0.692, 'Z': 0.599,
  '.': 0.285, '_': 0.758, '-': 0.560, ' ': 0.250, '!': 0.405, '?': 0.527
};

/**
 * Accurately estimates rendered text width for Poppins ExtraBold (800) at a given font-size,
 * including letter-spacing and terminal glyph overhang.
 */
export function estimateNameWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    width += (POPPINS_800_ADVANCES[char] ?? 0.62) * fontSize;
  }
  const letterSpacing = fontSize >= 50 ? -1 : -0.5;
  if (text.length > 1) {
    width += (text.length - 1) * letterSpacing;
  }
  // Terminal glyph overhang compensation (letters whose right stroke exceeds advance)
  const lastChar = text[text.length - 1];
  if (lastChar && /[rfktc]/.test(lastChar)) {
    width += fontSize * 0.08;
  }
  return Math.round(width);
}

export interface UsernameFittingResult {
  displayName: string;
  lines: string[];
  fontSize: number;
  width: number;
  isTruncated: boolean;
  letterSpacing: string;
}

function wrapUsername(text: string, fontSize: number, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let current = '';
  let overflowed = false;
  const segments = text.trim().split(/(?<=[a-z0-9])(?=[A-Z])|(?<=\s)/);

  for (const segment of segments) {
    let remaining = segment;
    if (estimateNameWidth(`${current}${remaining}`, fontSize) <= maxWidth) {
      current += remaining;
      continue;
    }
    if (current.trim()) lines.push(current.trimEnd());
    current = '';

    while (remaining && estimateNameWidth(remaining, fontSize) > maxWidth) {
      let end = 0;
      for (let index = 1; index <= remaining.length; index++) {
        if (estimateNameWidth(remaining.slice(0, index), fontSize) > maxWidth) break;
        end = index;
      }
      if (end === 0) end = 1;
      lines.push(remaining.slice(0, end).trimEnd());
      remaining = remaining.slice(end).trimStart();
      if (lines.length >= maxLines && remaining) {
        overflowed = true;
        break;
      }
    }
    current = remaining;
    if (overflowed) break;
  }

  if (!overflowed && current.trim()) lines.push(current.trimEnd());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    overflowed = true;
  }

  if (overflowed && lines.length) {
    let lastLine = lines[lines.length - 1];
    while (lastLine && estimateNameWidth(`${lastLine}...`, fontSize) > maxWidth) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${lastLine}...`;
  }

  return { lines, overflowed };
}

function appendEllipsis(lines: string[], fontSize: number, maxWidth: number): string[] {
  const result = [...lines];
  let lastLine = result[result.length - 1] ?? '';
  while (lastLine && estimateNameWidth(`${lastLine}...`, fontSize) > maxWidth) {
    lastLine = lastLine.slice(0, -1).trimEnd();
  }
  result[result.length - 1] = `${lastLine}...`;
  return result;
}

/**
 * Keeps short names large and wraps long names to at most three lines. Shrinking
 * starts only when a single line no longer fits; ellipses are reserved for overflow.
 */
export function fitWelcomeUsername(
  rawName: string,
  maxWidth = welcomeImageConfig.username.maxWidth,
  fontSize = welcomeImageConfig.username.fontSize,
  maxCharLimit = welcomeImageConfig.username.maxCharLimit
): UsernameFittingResult {
  const cleanName = sanitizeDisplayText(rawName, welcomeImageConfig.defaults.username);
  const charLimitedName = cleanName.slice(0, maxCharLimit).trimEnd();
  const wasCharLimited = charLimitedName.length < cleanName.length;
  const w = estimateNameWidth(charLimitedName, fontSize);

  // If the clean username fits directly within maxWidth, keep the full name with equal font size
  if (w <= maxWidth && !wasCharLimited) {
    return {
      displayName: cleanName,
      lines: [cleanName],
      fontSize,
      width: w,
      isTruncated: false,
      letterSpacing: fontSize >= 50 ? '-1' : '-0.5',
    };
  }

  let bestThreeLineFit: { lines: string[]; fontSize: number; width: number } | undefined;
  for (let candidateSize = Math.min(fontSize, 50); candidateSize >= welcomeImageConfig.username.minFontSize; candidateSize -= 2) {
    const wrapped = wrapUsername(charLimitedName, candidateSize, maxWidth, 3);
    const lines = wasCharLimited && !wrapped.overflowed
      ? appendEllipsis(wrapped.lines, candidateSize, maxWidth)
      : wrapped.lines;
    if (!wrapped.overflowed) {
      const width = Math.max(...lines.map((line) => estimateNameWidth(line, candidateSize)));
      if (!bestThreeLineFit) bestThreeLineFit = { lines, fontSize: candidateSize, width };
      if (lines.length <= 2) {
        return {
          displayName: lines.join('\n'),
          lines,
          fontSize: candidateSize,
          width,
          isTruncated: wasCharLimited,
          letterSpacing: candidateSize >= 50 ? '-1' : '-0.5',
        };
      }
    }
  }

  if (bestThreeLineFit) {
    return {
      displayName: bestThreeLineFit.lines.join('\n'),
      lines: bestThreeLineFit.lines,
      fontSize: bestThreeLineFit.fontSize,
      width: bestThreeLineFit.width,
      isTruncated: wasCharLimited,
      letterSpacing: bestThreeLineFit.fontSize >= 50 ? '-1' : '-0.5',
    };
  }

  const minFontSize = welcomeImageConfig.username.minFontSize;
  const wrapped = wrapUsername(charLimitedName, minFontSize, maxWidth, 3);
  const lines = wasCharLimited && !wrapped.overflowed
    ? appendEllipsis(wrapped.lines, minFontSize, maxWidth)
    : wrapped.lines;
  const width = Math.max(...lines.map((line) => estimateNameWidth(line, minFontSize)));
  return {
    displayName: lines.join('\n'),
    lines,
    fontSize: minFontSize,
    width,
    isTruncated: true,
    letterSpacing: minFontSize >= 50 ? '-1' : '-0.5',
  };
}

export function mapWelcomeImageData(
  svgTemplate: string,
  data: WelcomeImageInput,
  avatarDataUri?: string
): string {
  let output = svgTemplate;

  // 1. Inject Avatar if data URI provided
  if (avatarDataUri) {
    const avatarGroupRegex = /<!-- (?:Custom User Avatar|Clipped Character Illustration).*?-->[\s\S]*?(?=<!-- Subtle Inner Border -->)/;
    const { x, y, width, height } = welcomeImageConfig.avatar;
    const avatarMarkup = `<!-- Custom User Avatar inside Avatar Clip -->
    <g clip-path="url(#avatarClip)" id="avatarContent">
      ${buildSvgImageTag({ dataUri: avatarDataUri, x, y, width, height, preserveAspectRatio: 'xMidYMid slice' })}
    </g>
    `;
    output = output.replace(avatarGroupRegex, avatarMarkup);
  }

  // 2. Greeting Header
  const rawGreeting = data.greeting ?? welcomeImageConfig.defaults.greeting;
  const escapedGreeting = escapeXmlText(rawGreeting);

  // 3. Username Replacement with dynamic sizing / truncation
  const rawUsername =
    data.username ??
    data.name ??
    data.profile?.username ??
    data.profile?.name ??
    data.user?.username ??
    data.user?.name ??
    welcomeImageConfig.defaults.username;

  const maxCharLimit = data.maxCharLimit ?? welcomeImageConfig.username.maxCharLimit;
  const usernameFitting = fitWelcomeUsername(
    rawUsername,
    welcomeImageConfig.username.maxWidth,
    welcomeImageConfig.username.fontSize,
    maxCharLimit
  );
  const multiline = usernameFitting.lines.length > 1;
  const greetingY = multiline ? 160 : 191;
  output = output.replace(
    /<text id="welcomeGreeting" [^>]*>[^<]*<\/text>|<text x="325" y="191" [^>]*>[^<]*<\/text>/,
    `<text id="welcomeGreeting" x="325" y="${greetingY}" font-size="73" font-weight="800" fill="#0F141D" letter-spacing="-1.5">${escapedGreeting}</text>`
  );

  const usernameY = multiline ? welcomeImageConfig.username.wrappedStartY : welcomeImageConfig.username.startY;
  const lineMarkup = usernameFitting.lines
    .map((line, index) => `<tspan x="325"${index === 0 ? '' : ` dy="${welcomeImageConfig.username.wrappedLineHeight}"`}>${escapeXmlText(line)}</tspan>`)
    .join('');

  output = output.replace(
    /<text id="welcomeUsername" [^>]*>[^<]*<\/text>|<text x="325" y="271" [^>]*>[^<]*<\/text>/,
    `<text id="welcomeUsername" x="325" y="${usernameY}" font-size="${usernameFitting.fontSize}" font-weight="800" fill="#FF5A43" letter-spacing="${usernameFitting.letterSpacing}">${lineMarkup}</text>`
  );

  if (multiline) {
    output = output.replace(
      '<g id="gladBadge" class="font-main">',
      `<g id="gladBadge" class="font-main" transform="translate(0 ${welcomeImageConfig.username.wrappedBadgeOffset})">`
    );
  }

  // 4. Accent Rays Dynamic Positioning on both X and Y axis (appears for all types of names)
  const showAccentRays = data.showAccentRays !== false && !multiline;
  const raysRegex = /<!-- 3 Yellow Accent Rays.*?-->[\s\S]*?<g id="accentRays"[^>]*>[\s\S]*?<\/g>|<g id="accentRays"[^>]*>[\s\S]*?<\/g>|<!-- 3 Yellow Accent Rays next to "Aarav!" -->\s*<line x1="608"[\s\S]*?<line x1="617"[^>]*\/>/;

  if (showAccentRays) {
    const s = Number(
      Math.max(
        welcomeImageConfig.accentRays.minScale,
        Math.min(welcomeImageConfig.accentRays.maxScale, usernameFitting.fontSize / 73)
      ).toFixed(2)
    );
    // Equal padding between text right edge and leftmost point of the sparkle lines
    const padding = welcomeImageConfig.accentRays.padding;
    const targetX = Math.round(
      welcomeImageConfig.username.startX + usernameFitting.width + padding + 3 * s
    );
    // Dynamic Y alignment matching the vertical mid-height of the text
    const targetY = Math.round(271 - usernameFitting.fontSize * 0.45);

    const origX = welcomeImageConfig.accentRays.originalAnchorX;
    const origY = welcomeImageConfig.accentRays.originalAnchorY;

    const raysMarkup = `<!-- 3 Yellow Accent Rays next to username -->
    <g id="accentRays" transform="translate(${targetX}, ${targetY}) scale(${s}) translate(-${origX}, -${origY})">
      <line x1="608" y1="228" x2="622" y2="213" stroke="#F9B949" stroke-width="6" stroke-linecap="round" />
      <line x1="616" y1="243" x2="641" y2="235" stroke="#F9B949" stroke-width="6" stroke-linecap="round" />
      <line x1="617" y1="257" x2="631" y2="263" stroke="#F9B949" stroke-width="6" stroke-linecap="round" />
    </g>`;
    output = output.replace(raysRegex, raysMarkup);
  } else {
    output = output.replace(raysRegex, '<!-- 3 Yellow Accent Rays omitted -->');
  }

  // 5. Badge Text
  const rawBadge = data.badgeText ?? data.subtitle;
  if (rawBadge) {
    output = output.replace(
      /(<g id="gladBadge"[\s\S]*?<text [^>]*>)[^<]*(<\/text>)/,
      `$1${escapeXmlText(rawBadge)}$2`
    );
  }

  // 6. Quote Card lines (if custom provided)
  if (data.quoteTitle) {
    output = output.replace(
      /(<g id="quoteCard"[\s\S]*?<text x="164" y="418" [^>]*>)[^<]*(<\/text>)/,
      `$1${escapeXmlText(data.quoteTitle)}$2`
    );
  }
  if (data.quoteLine1) {
    output = output.replace(
      /(<g id="quoteCard"[\s\S]*?<text x="164" y="454" [^>]*>)[^<]*(<\/text>)/,
      `$1${escapeXmlText(data.quoteLine1)}$2`
    );
  }
  if (data.quoteLine2) {
    output = output.replace(
      /(<g id="quoteCard"[\s\S]*?<text x="164" y="487" [^>]*>)[^<]*(<\/text>)/,
      `$1${escapeXmlText(data.quoteLine2)}$2`
    );
  }

  return output;
}
