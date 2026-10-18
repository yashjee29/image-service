import { escapeXmlText } from '../../core/svg/svg-escaping.js';
import { rankAssetCache } from '../../core/images/rank-asset-cache.js';
import { voiceProfileConfig } from './config.js';
import type { VoiceProfileInput } from './schema.js';

/**
 * Format minutes into integer hours or hours and minutes
 * e.g. 19260 -> "321h", 11280 -> "1,128h"
 */
export function formatDurationHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  const hoursFormatted = hours.toLocaleString('en-US');
  if (remainingMins === 0) {
    return `${hoursFormatted}h`;
  }
  const minsFormatted = remainingMins < 10 ? `0${remainingMins}` : `${remainingMins}`;
  return `${hoursFormatted}h ${minsFormatted}m`;
}

/**
 * Format minutes into hours and minutes with leading zeroes for small hours.
 * If minutes is an exact hour (0 minutes remaining, e.g. 0m, 300m), only hours are shown (e.g. "0h", "5h").
 * Otherwise, e.g. 491 -> "08h 11m", 116270 -> "1,937h 50m"
 */
export function formatDurationHoursAndMins(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  if (remainingMins === 0) {
    return `${hours.toLocaleString('en-US')}h`;
  }
  const hStr = hours < 10 ? `0${hours}` : hours.toLocaleString('en-US');
  const mStr = remainingMins < 10 ? `0${remainingMins}` : `${remainingMins}`;
  return `${hStr}h ${mStr}m`;
}

/**
 * Format minutes for chart bars.
 * If minutes is an exact hour (e.g. 0m, 300m), only hours are shown (e.g. "0h", "5h").
 * Otherwise, e.g. 392 -> "6h 32m".
 */
export function formatActivityDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  const mStr = remainingMins < 10 ? `0${remainingMins}` : `${remainingMins}`;
  return `${hours}h ${mStr}m`;
}

/**
 * Formats monthly label by abbreviating long month names (>5 letters)
 * to 3 letters (e.g. October -> Oct, December -> Dec, January -> Jan),
 * while keeping short/medium months (March, April, May, June, July) in full.
 * Preserves casing if already uppercase or title-case.
 */
export function formatMonthlyLabel(rawLabel: string): string {
  const longMonthMap: Record<string, string> = {
    january: 'Jan',
    february: 'Feb',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
  };

  return rawLabel.replace(
    /\b(january|february|august|september|october|november|december)\b/gi,
    (match) => {
      const replacement = longMonthMap[match.toLowerCase()] ?? match;
      return match === match.toUpperCase() ? replacement.toUpperCase() : replacement;
    }
  );
}

/**
 * Estimates text width for Poppins SemiBold font at a given font-size.
 */
export function estimateTextWidth(text: string, fontSize = 13.5): number {
  let width = 0;
  for (const char of text) {
    if (/[il1.,'|:;!]/.test(char)) {
      width += fontSize * 0.28;
    } else if (/[fjrtI ]/.test(char)) {
      width += fontSize * 0.38;
    } else if (/[mwMW]/.test(char)) {
      width += fontSize * 0.85;
    } else if (/[A-Z]/.test(char)) {
      width += fontSize * 0.68;
    } else if (/[0-9]/.test(char)) {
      width += fontSize * 0.58;
    } else {
      width += fontSize * 0.54;
    }
  }
  return Math.ceil(width);
}

/**
 * Estimates text width for Plus Jakarta Sans / Poppins Bold at a given font-size.
 */
export function estimateNameWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    if (/[il1.,'|:;! ]/.test(char)) {
      width += fontSize * 0.32;
    } else if (/[fjrtI]/.test(char)) {
      width += fontSize * 0.40;
    } else if (/[mwMW@#%&]/.test(char)) {
      width += fontSize * 0.95;
    } else if (/[A-Z]/.test(char)) {
      width += fontSize * 0.72;
    } else if (/[0-9]/.test(char)) {
      width += fontSize * 0.62;
    } else {
      width += fontSize * 0.58;
    }
  }
  return Math.ceil(width);
}

/**
 * Exact character advance widths for Poppins 15px at SemiBold (600) / Medium (500).
 */
const POPPINS_15PX_ADVANCES: Record<string, number> = {
  '0': 9.69, '1': 5.43, '2': 8.61, '3': 8.99, '4': 9.92,
  '5': 9.66, '6': 9.60, '7': 8.22, '8': 9.65, '9': 9.39,
  'a': 10.17, 'b': 10.17, 'c': 9.03, 'd': 10.17, 'e': 9.26,
  'f': 5.18, 'g': 10.17, 'h': 9.92, 'i': 4.17, 'j': 4.17,
  'k': 8.76, 'l': 4.17, 'm': 15.72, 'n': 9.92, 'o': 9.57,
  'p': 10.17, 'q': 10.17, 'r': 6.06, 's': 8.18, 't': 5.82,
  'u': 9.92, 'v': 8.99, 'w': 12.66, 'x': 8.10, 'y': 9.08, 'z': 7.25,
  'A': 10.74, 'B': 9.65, 'C': 11.52, 'D': 10.76, 'E': 7.98,
  'F': 7.95, 'G': 11.52, 'H': 10.76, 'I': 4.17, 'J': 8.55,
  'K': 9.95, 'L': 6.89, 'M': 13.49, 'N': 11.02, 'O': 11.77,
  'P': 9.12, 'Q': 11.81, 'R': 9.61, 'S': 9.14, 'T': 8.66,
  'U': 10.45, 'V': 10.67, 'W': 15.36, 'X': 10.29, 'Y': 9.54, 'Z': 8.64,
  '(': 7.27, ')': 7.27, '+': 10.11, ',': 3.81, '-': 8.75, '.': 3.90, ' ': 3.57,
};

/**
 * Estimates exact rendered width of rank progression text in Poppins 15px.
 */
export function estimateRankTextWidth(rankName: string, rankRange: string): number {
  const full = `${rankName} ${rankRange}`;
  let w = 0;
  for (const ch of full) {
    w += POPPINS_15PX_ADVANCES[ch] ?? 9.0;
  }
  return Math.round(w - 2.5);
}

/**
 * Computes strictly balanced coordinates for the progression row:
 * - Equal spacing on the left and right of the progression arrow: gapLeft === gapRight === gap (16px).
 * - Arrow length: 16px.
 * - Next rank badge center and text start offset identically to current badge.
 * - Responsive progress bar positioning to prevent collisions.
 */
export function layoutRankProgression(
  curName: string,
  curRange: string,
  nxtName: string,
  nxtRange: string,
  progressPercent: number
) {
  const gap = 16;
  const arrowLen = 16;
  const text1Start = 56;
  const text1Width = estimateRankTextWidth(curName, curRange);
  const text1End = text1Start + text1Width;

  const arrowStart = text1End + gap;
  const arrowEnd = arrowStart + arrowLen;

  const nextBadgeLeft = arrowEnd + gap;
  const nextBadgeX = nextBadgeLeft + 20;

  const nextTextX = nextBadgeX + 26;
  const text2Width = estimateRankTextWidth(nxtName, nxtRange);
  const nextTextEnd = nextTextX + text2Width;

  const progressBarX = Math.max(526, nextTextEnd + 16);
  const maxBarRight = 774;
  const barTotalWidth = Math.max(160, maxBarRight - progressBarX);
  const barFilledWidth = Math.min(barTotalWidth, Math.max(0, Math.round((progressPercent / 100) * barTotalWidth)));

  return {
    text1Start,
    text1Width,
    text1End,
    arrowStart,
    arrowEnd,
    arrowLen,
    nextBadgeX,
    nextTextX,
    nextTextEnd,
    progressBarX,
    barTotalWidth,
    barFilledWidth,
  };
}

/**
 * Fits username within available space without colliding with Achievements card:
 * 1. Tries font sizes: 44, 40, 36, 32.
 * 2. If it still overflows at 32px, truncates with "..." at the end.
 */
export function fitUsername(
  rawName: string,
  maxWidth = 300
): { displayName: string; fontSize: number; width: number } {
  const fontSizes = [44, 40, 36, 32];
  for (const size of fontSizes) {
    const w = estimateNameWidth(rawName, size);
    if (w <= maxWidth) {
      return { displayName: rawName, fontSize: size, width: w };
    }
  }

  // Truncate at size 32
  const minSize = 32;
  for (let len = rawName.length - 1; len >= 1; len--) {
    const candidate = rawName.substring(0, len) + '...';
    const w = estimateNameWidth(candidate, minSize);
    if (w <= maxWidth) {
      return { displayName: candidate, fontSize: minSize, width: w };
    }
  }
  return { displayName: '...', fontSize: minSize, width: estimateNameWidth('...', minSize) };
}

export interface BadgeStyle {
  bg: string;
  color: string;
  textOffset: number;
  renderIcon: (yOffset: number) => string;
}

export const BADGE_STYLES: BadgeStyle[] = [
  // 0: Crown (Coral / Salmon)
  {
    bg: '#FEEDEB',
    color: '#FA6863',
    textOffset: 38,
    renderIcon: (yOffset: number) => `
      <g transform="translate(0, ${yOffset})">
        <path d="M13 27 L11 16 L16.5 20.5 L21 14 L25.5 20.5 L31 16 L29 27 Z" fill="#FA6863" stroke="#FA6863" stroke-width="1" stroke-linejoin="round" />
        <rect x="13" y="29" width="16" height="2.2" rx="1" fill="#FA6863" />
      </g>`,
  },
  // 1: Trophy (Warm Peach / Orange)
  {
    bg: '#FDF0E7',
    color: '#FDA06D',
    textOffset: 35,
    renderIcon: (yOffset: number) => `
      <g transform="translate(0, ${yOffset})">
        <path d="M14 14 H26 V20 C26 23.5 23.2 26 20 26 C16.8 26 14 23.5 14 20 Z" fill="#FDA06D" />
        <path d="M14 16 H11.5 C11.5 19 12.5 21 14.5 21.5" stroke="#FDA06D" stroke-width="1.8" fill="none" stroke-linecap="round" />
        <path d="M26 16 H28.5 C28.5 19 27.5 21 25.5 21.5" stroke="#FDA06D" stroke-width="1.8" fill="none" stroke-linecap="round" />
        <rect x="18.5" y="25.5" width="3" height="3.5" fill="#FDA06D" />
        <rect x="15" y="29" width="10" height="2.2" rx="1" fill="#FDA06D" />
      </g>`,
  },
  // 2: Shield (Soft Lavender / Purple)
  {
    bg: '#F6F1F8',
    color: '#8E7AC5',
    textOffset: 36,
    renderIcon: (yOffset: number) => `
      <g transform="translate(0, ${yOffset})">
        <path d="M19 13 L27 16.2 V22.2 C27 26.8 23.6 30.2 19 31.8 C14.4 30.2 11 26.8 11 22.2 V16.2 Z" fill="none" stroke="#8E7AC5" stroke-width="2" stroke-linejoin="round" />
        <polygon points="19,17.5 20.4,20.3 23.5,20.7 21.2,22.9 21.8,26 19,24.5 16.2,26 16.8,22.9 14.5,20.7 17.6,20.3" fill="#8E7AC5" />
      </g>`,
  },
  // 3: Star (Sage Mint / Teal)
  {
    bg: '#EAF5F0',
    color: '#71BEA2',
    textOffset: 36,
    renderIcon: (yOffset: number) => `
      <g transform="translate(0, ${yOffset})">
        <polygon points="20,13 22.5,18.5 28.5,19.3 24,23.5 25.2,29.5 20,26.5 14.8,29.5 16,23.5 11.5,19.3 17.5,18.5" fill="#71BEA2" />
      </g>`,
  },
  // 4: Flame (Coral / Salmon)
  {
    bg: '#FEEDEB',
    color: '#FA6863',
    textOffset: 35,
    renderIcon: (yOffset: number) => `
      <g transform="translate(0, ${yOffset})">
        <path d="M20 13 C20 13 23.5 17 23.5 20.5 C23.5 22 22.5 23.5 21.5 24.5 C23.5 24.5 26 22.5 26 19.5 C26 25.5 21.5 29.5 19 29.5 C15 29.5 13.5 26 13.5 23.5 C13.5 19.5 17 15.5 20 13 Z" fill="#FA6863" />
        <path d="M19 23 C19 23 17.5 24.5 17.5 26 C17.5 27 18.2 28 19.2 28 C20.2 28 21 27 21 26 C21 24.5 19.8 23.5 19 23 Z" fill="#FFE2DE" />
      </g>`,
  },
  // 5: Diamond (Sage Mint)
  {
    bg: '#EAF5F0',
    color: '#71BEA2',
    textOffset: 35,
    renderIcon: (yOffset: number) => `
      <g transform="translate(0, ${yOffset})">
        <polygon points="19,13 26,19 19,29 12,19" fill="#71BEA2" />
        <polygon points="19,13 22.5,19 19,29 15.5,19" fill="#A8E6CF" opacity="0.7" />
      </g>`,
  },
  // 6: Medal (Soft Lavender)
  {
    bg: '#F6F1F8',
    color: '#8E7AC5',
    textOffset: 34,
    renderIcon: (yOffset: number) => `
      <g transform="translate(0, ${yOffset})">
        <polygon points="15.5,13 18.5,18 18.5,13" fill="#B8A9E3" />
        <polygon points="21.5,13 18.5,18 18.5,13" fill="#8E7AC5" />
        <circle cx="18.5" cy="23.5" r="5.5" fill="#8E7AC5" />
        <circle cx="18.5" cy="23.5" r="2.5" fill="#F6F1F8" />
      </g>`,
  },
  // 7: Target (Warm Peach / Apricot)
  {
    bg: '#FDF0E7',
    color: '#FDA06D',
    textOffset: 35,
    renderIcon: (yOffset: number) => `
      <g transform="translate(0, ${yOffset})">
        <circle cx="19" cy="21.5" r="8" fill="none" stroke="#FDA06D" stroke-width="2" />
        <circle cx="19" cy="21.5" r="4" fill="none" stroke="#FDA06D" stroke-width="2" />
        <circle cx="19" cy="21.5" r="1.5" fill="#FDA06D" />
      </g>`,
  },
];

export function resolveBadgeStyle(
  badge: { id?: string; assetKey?: string; name: string },
  index: number
): BadgeStyle {
  const key = `${badge.id ?? ''} ${badge.assetKey ?? ''} ${badge.name ?? ''}`.toLowerCase();
  if (key.includes('crown') || key.includes('hall-of-fame') || key.includes('fame')) {
    return BADGE_STYLES[0]!;
  }
  if (key.includes('trophy') || key.includes('performer') || key.includes('top')) {
    return BADGE_STYLES[1]!;
  }
  if (key.includes('shield') || key.includes('winner') || key.includes('champion')) {
    return BADGE_STYLES[2]!;
  }
  if (key.includes('star') || key.includes('superstar') || key.includes('mvp') || key.includes('vip')) {
    return BADGE_STYLES[3]!;
  }
  if (key.includes('flame') || key.includes('fire') || key.includes('streak') || key.includes('hot')) {
    return BADGE_STYLES[4]!;
  }
  if (key.includes('diamond') || key.includes('gem') || key.includes('elite')) {
    return BADGE_STYLES[5]!;
  }
  if (key.includes('medal') || key.includes('veteran') || key.includes('pro')) {
    return BADGE_STYLES[6]!;
  }
  if (key.includes('target') || key.includes('goal') || key.includes('sharpshooter')) {
    return BADGE_STYLES[7]!;
  }
  return BADGE_STYLES[index % BADGE_STYLES.length]!;
}

export function layoutBadges(badges: Array<{ id?: string; assetKey?: string; name: string }>): string {
  if (!badges || badges.length === 0) {
    return '';
  }

  const START_X = 252;
  const BORDER_X = 644;
  const TOTAL_SPAN = BORDER_X - START_X; // 392
  const DEFAULT_GAP = 10;
  const PADDING_RIGHT = 12;

  // 1. Calculate width for each badge, capping single badge at 382px with truncation if needed
  const badgeItems = badges.map((b, i) => {
    const style = resolveBadgeStyle(b, i);
    let displayName = b.name;
    let tw = estimateTextWidth(displayName, 13.5);
    let width = Math.max(80, style.textOffset + tw + PADDING_RIGHT);

    const maxBadgeWidth = TOTAL_SPAN - DEFAULT_GAP; // 382
    if (width > maxBadgeWidth) {
      for (let len = displayName.length - 1; len >= 1; len--) {
        const candidate = displayName.substring(0, len) + '...';
        const candTw = estimateTextWidth(candidate, 13.5);
        const candW = Math.max(80, style.textOffset + candTw + PADDING_RIGHT);
        if (candW <= maxBadgeWidth) {
          displayName = candidate;
          width = candW;
          break;
        }
      }
    }

    return { badge: b, displayName, style, width };
  });

  // 2. Pack into rows (max 2 rows so as not to override Hours Overview)
  const rows: Array<typeof badgeItems> = [[]];

  for (const item of badgeItems) {
    const currentRow = rows[rows.length - 1]!;
    const countWithItem = currentRow.length + 1;
    const currentSum = currentRow.reduce((sum, x) => sum + x.width, 0);
    const needed = currentSum + item.width + countWithItem * DEFAULT_GAP;

    if (needed <= TOTAL_SPAN) {
      currentRow.push(item);
    } else if (rows.length < 2) {
      rows.push([item]);
    } else {
      break;
    }
  }

  const numRows = rows.length;
  const isMultiRow = numRows > 1;
  const pillHeight = isMultiRow ? 40 : 44;
  const textY = isMultiRow ? 25 : 27;
  const iconYOffset = isMultiRow ? -2 : 0;
  const rowYCoords = isMultiRow ? [208, 256] : [213];

  let markup = '<!-- Dynamic Badges -->';
  rows.forEach((row, rIdx) => {
    const isFullRow = (rIdx < rows.length - 1) || (row.length >= 3);
    const count = row.length;
    let curX = START_X;
    const curY = rowYCoords[rIdx]!;

    if (isFullRow && count > 1) {
      const sumWidth = row.reduce((sum, x) => sum + x.width, 0);
      const remaining = TOTAL_SPAN - sumWidth;
      const gap = Math.floor(remaining / count);
      let leftover = remaining - gap * count;

      const adjustedRow = row.map((item) => {
        let add = 0;
        if (leftover > 0) {
          add = 1;
          leftover--;
        }
        return { ...item, width: item.width + add };
      });

      adjustedRow.forEach((item) => {
        const x = curX;
        curX += item.width + gap;
        markup += `\n    <g transform="translate(${x}, ${curY})">
      <rect x="0" y="0" width="${item.width}" height="${pillHeight}" rx="10" fill="${item.style.bg}" />
      ${item.style.renderIcon(iconYOffset).trim()}
      <text x="${item.style.textOffset}" y="${textY}" font-size="13.5" font-weight="600" fill="${item.style.color}">${escapeXmlText(item.displayName)}</text>
    </g>`;
      });
    } else {
      row.forEach((item) => {
        const x = curX;
        curX += item.width + DEFAULT_GAP;
        markup += `\n    <g transform="translate(${x}, ${curY})">
      <rect x="0" y="0" width="${item.width}" height="${pillHeight}" rx="10" fill="${item.style.bg}" />
      ${item.style.renderIcon(iconYOffset).trim()}
      <text x="${item.style.textOffset}" y="${textY}" font-size="13.5" font-weight="600" fill="${item.style.color}">${escapeXmlText(item.displayName)}</text>
    </g>`;
      });
    }
  });

  return markup;
}

export function mapVoiceProfileData(
  svgTemplate: string,
  data: VoiceProfileInput,
  avatarDataUri?: string
): string {
  let output = svgTemplate;
  const defaults = voiceProfileConfig.defaults;

  // 1. Inject Avatar
  if (avatarDataUri) {
    const avatarGroupRegex = /<!-- (?:Stylized Vector Portrait|Custom User Avatar) inside Avatar Clip -->[\s\S]*?(?=<!-- Inner Avatar Border Ring -->)/;
    const { x, y, width, height } = voiceProfileConfig.avatar;
    const avatarMarkup = `<!-- Custom User Avatar inside Avatar Clip -->
    <g clip-path="url(#avatar-clip)">
      <image href="${avatarDataUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />
    </g>

    `;
    output = output.replace(avatarGroupRegex, avatarMarkup);
  }

  // 1.5 & 2. Username and Dynamic Rank Icon
  const rawUsername = data.profile?.username ?? data.username ?? defaults.username;
  const usernameFitting = fitUsername(rawUsername, 300);
  const escapedDisplayName = escapeXmlText(usernameFitting.displayName);

  output = output.replace(
    /<text x="252" y="139" font-size="\d+" class="title-dark" letter-spacing="-0\.02em">[^<]*<\/text>/,
    `<text x="252" y="139" font-size="${usernameFitting.fontSize}" class="title-dark" letter-spacing="-0.02em">${escapedDisplayName}</text>`
  );

  const rankX = Math.min(599, Math.round(252 + usernameFitting.width + 16 + 30));
  const currentRankId = data.rank?.current?.id ?? data.rankId ?? defaults.currentRankId;
  const currentRankDataUri = rankAssetCache.getRankDataUri(currentRankId, 120);
  const rankRegex = /<!-- (?:[A-Za-z]+ )?rank icon[\s\S]*?<g transform="translate\(\d+,\s*123\)">[\s\S]*?<\/g>/i;

  if (currentRankDataUri) {
    const rankTag = `<!-- Rank icon (${escapeXmlText(currentRankId)}) -->
    <g transform="translate(${rankX}, 123)">
      <image href="${currentRankDataUri}" x="-30" y="-30" width="60" height="60" preserveAspectRatio="xMidYMid meet" />
    </g>`;
    output = output.replace(rankRegex, rankTag);
  } else {
    output = output.replace(
      /(<!-- (?:[A-Za-z]+ )?rank icon[\s\S]*?<g transform="translate\()\d+(,\s*123\)">)/i,
      `$1${rankX}$2`
    );
  }

  // 3. Bio
  const bio = data.profile?.bio ?? data.bio;
  if (bio !== undefined) {
    const escapedBio = escapeXmlText(bio);
    output = output.replace(
      /<text x="253" y="181" font-size="20" font-weight="500" fill="[^"]*">[^<]*<\/text>/,
      `<text x="253" y="181" font-size="20" font-weight="500" fill="#5A6275">${escapedBio}</text>`
    );
  }

  // 3.5. Badges
  const badgeList =
    data.badges !== undefined
      ? data.badges
      : [
          { id: 'hall-of-fame', name: 'Hall of Fame', assetKey: 'badge-hall-of-fame' },
          { id: 'top-performer', name: 'Top Performer', assetKey: 'badge-top-performer' },
          { id: 'winner', name: 'Winner', assetKey: 'badge-winner' },
        ];

  const badgesMarkup = layoutBadges(badgeList);
  const badgesBlockRegex = /<!-- Badge 1:[\s\S]*?<!-- Badge 3:[\s\S]*?<\/g>/;
  output = output.replace(badgesBlockRegex, badgesMarkup);

  // 4. Counters (Achievements, Goals, Milestones)
  const achievements = data.counters?.achievements ?? data.achievements ?? defaults.achievements;
  output = output.replace(
    /(<!-- 1\. Achievements -->[\s\S]*?<text x="89" y="50" font-size="28" class="stat-num">)[^<]*(<\/text>)/,
    `$1${achievements}$2`
  );

  const goals = data.counters?.goals ?? data.goals ?? defaults.goals;
  output = output.replace(
    /(<!-- 2\. Goals -->[\s\S]*?<text x="283" y="50" font-size="28" class="stat-num">)[^<]*(<\/text>)/,
    `$1${goals}$2`
  );

  const milestones = data.counters?.milestones ?? data.milestones ?? defaults.milestones;
  output = output.replace(
    /(<!-- 3\. Milestones -->[\s\S]*?<text x="428" y="50" font-size="28" class="stat-num">)[^<]*(<\/text>)/,
    `$1${milestones}$2`
  );

  // 5. Leaderboard
  let rankStr = defaults.leaderboardRank;
  if (data.leaderboard?.rank !== undefined) {
    const rawRank = String(data.leaderboard.rank);
    rankStr = rawRank.startsWith('#') ? rawRank : `#${rawRank}`;
  }
  output = output.replace(
    /<text x="49" y="114" font-size="52" font-weight="800" fill="[^"]*">[^<]*<\/text>/,
    `<text x="49" y="114" font-size="52" font-weight="800" fill="#FE888B">${escapeXmlText(rankStr)}</text>`
  );

  let percentileStr = defaults.leaderboardPercentile;
  if (data.leaderboard?.topPercent !== undefined) {
    const rawPercent = String(data.leaderboard.topPercent);
    percentileStr = rawPercent.startsWith('Top') ? rawPercent : `Top ${rawPercent}%`;
  }
  output = output.replace(
    /<text x="49" y="148" font-size="17" font-weight="600" fill="[^"]*">[^<]*<\/text>/,
    `<text x="49" y="148" font-size="17" font-weight="600" fill="#5A6275">${escapeXmlText(percentileStr)}</text>`
  );

  // Leaderboard trend bars
  if (data.leaderboard?.trendValues && data.leaderboard.trendValues.length === 4) {
    const values = data.leaderboard.trendValues;
    const maxVal = Math.max(...values, 50);
    const xCoords = [31, 70, 109, 148];
    const baselineY = 398;

    let barsReplacement = '<!-- Decorative Vertical Bars at Bottom -->';
    values.forEach((val, idx) => {
      const height = Math.min(207, Math.max(20, Math.round((val / maxVal) * 207)));
      const y = baselineY - height;
      barsReplacement += `\n      <rect x="${xCoords[idx]}" y="${y}" width="26" height="${height}" rx="4" fill="url(#leaderboard-bar)" />`;
    });

    const trendBarsRegex = /<!-- Decorative Vertical Bars at Bottom -->[\s\S]*?<rect x="148" y="\d+" width="26" height="\d+" rx="4" fill="url\(#leaderboard-bar\)" \/>/;
    output = output.replace(trendBarsRegex, barsReplacement.trim());
  }

  // 6. Hours Overview
  const monthlyLabel = data.hours?.monthly?.label ?? data.hoursOverview?.monthlyLabel ?? defaults.monthlyLabel;
  if (monthlyLabel) {
    const formattedMonthly = formatMonthlyLabel(monthlyLabel);
    output = output.replace(
      /<text x="34" y="16" class="sub-header">[^<]*<\/text>/,
      `<text x="34" y="16" class="sub-header">${escapeXmlText(formattedMonthly.toUpperCase())}</text>`
    );
  }

  const monthlyVal =
    data.hours?.monthly?.durationMinutes !== undefined
      ? formatDurationHours(data.hours.monthly.durationMinutes)
      : data.hoursOverview?.monthly ?? defaults.monthlyHours;
  output = output.replace(
    /(<!-- Column 1: MAY \(MONTHLY\) -->[\s\S]*?<text x="0" y="68" font-size="36" class="stat-num">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(monthlyVal)}$2`
  );

  const weeklyVal =
    data.hours?.weekly?.durationMinutes !== undefined
      ? formatDurationHours(data.hours.weekly.durationMinutes)
      : data.hoursOverview?.weekly ?? defaults.weeklyHours;
  output = output.replace(
    /(<!-- Column 2: WEEKLY -->[\s\S]*?<text x="0" y="68" font-size="36" class="stat-num">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(weeklyVal)}$2`
  );

  const dailyVal =
    data.hours?.daily?.durationMinutes !== undefined
      ? formatDurationHoursAndMins(data.hours.daily.durationMinutes)
      : data.hoursOverview?.daily ?? defaults.dailyHours;
  output = output.replace(
    /(<!-- Column 3: DAILY -->[\s\S]*?<text x="0" y="68" font-size="36" class="stat-num">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(dailyVal)}$2`
  );

  const allTimeVal =
    data.hours?.allTime?.durationMinutes !== undefined
      ? formatDurationHoursAndMins(data.hours.allTime.durationMinutes)
      : data.hoursOverview?.allTime ?? defaults.allTimeHours;
  output = output.replace(
    /(<!-- Column 4: ALL TIME -->[\s\S]*?<text x="0" y="68" font-size="36" class="stat-num">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(allTimeVal)}$2`
  );

  // 7. Next Rank Progression ("TO NEXT RANK GROUP")
  if (data.rank || data.nextRank) {
    let curRankId = defaults.currentRankId;
    let curName = defaults.currentRankName;
    let curRange = defaults.currentRankRange;
    let nxtRankId = defaults.nextRankId;
    let nxtName = defaults.nextRankName;
    let nxtRange = defaults.nextRankRange;
    let progressPercent = defaults.rankProgressPercent;

    if (data.rank) {
      curRankId = data.rank.current.id;
      curName = data.rank.current.name;
      curRange = `(${data.rank.current.minimumHours}h to ${data.rank.current.maximumHours}h)`;
      nxtRankId = data.rank.next.id;
      nxtName = data.rank.next.name;
      nxtRange = `(${data.rank.next.minimumHours}h to ${data.rank.next.maximumHours}h)`;
      progressPercent = data.rank.progressPercent ?? defaults.rankProgressPercent;
    } else if (data.nextRank) {
      if (data.nextRank.currentRank) curName = data.nextRank.currentRank;
      if (data.nextRank.currentRange) curRange = data.nextRank.currentRange;
      if (data.nextRank.nextRank) nxtName = data.nextRank.nextRank;
      if (data.nextRank.nextRange) nxtRange = data.nextRank.nextRange;
      curRankId = curName.toLowerCase();
      nxtRankId = nxtName.toLowerCase();
      if (data.nextRank.progressPercent !== undefined) {
        progressPercent = data.nextRank.progressPercent;
      }
    }

    const curBadgeUri = rankAssetCache.getRankDataUri(curRankId, 80);
    const nxtBadgeUri = rankAssetCache.getRankDataUri(nxtRankId, 80);

    const existingCurBadgeMatch = output.match(/<g transform="translate\(30, 63\)">\s*<image href="([^"]*)"/);
    const existingNxtBadgeMatch = output.match(/<g transform="translate\(\d+, 63\)">\s*<image href="([^"]*)"/);
    const finalCurBadge = curBadgeUri ?? existingCurBadgeMatch?.[1] ?? '';
    const finalNxtBadge = nxtBadgeUri ?? existingNxtBadgeMatch?.[1] ?? '';

    const layout = layoutRankProgression(curName, curRange, nxtName, nxtRange, progressPercent);

    const progressionSvg = `<!-- Current Rank Badge -->
        <g transform="translate(30, 63)">
          <image href="${finalCurBadge}" x="-20" y="-20" width="40" height="40" preserveAspectRatio="xMidYMid meet" />
        </g>

        <!-- Current Rank Text -->
        <text x="56" y="68" font-size="15" font-weight="600" fill="#0E1726">
          ${escapeXmlText(curName)} <tspan fill="#1A5096" font-weight="500">${escapeXmlText(curRange)}</tspan>
        </text>

        <!-- Arrow right -->
        <path d="M${layout.arrowStart} 63 H${layout.arrowEnd} M${layout.arrowEnd - 5} 58.5 L${layout.arrowEnd} 63 L${layout.arrowEnd - 5} 67.5" stroke="#1A5096" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />

        <!-- Next Rank Badge -->
        <g transform="translate(${layout.nextBadgeX}, 63)">
          <image href="${finalNxtBadge}" x="-20" y="-20" width="40" height="40" preserveAspectRatio="xMidYMid meet" />
        </g>

        <!-- Next Rank Text -->
        <text x="${layout.nextTextX}" y="68" font-size="15" font-weight="600" fill="#0E1726">
          ${escapeXmlText(nxtName)} <tspan fill="#1A5096" font-weight="500">${escapeXmlText(nxtRange)}</tspan>
        </text>

        <!-- Progress Bar -->
        <rect x="${layout.progressBarX}" y="57" width="${layout.barTotalWidth}" height="8" rx="4" fill="#F4EDEB" />
        <rect x="${layout.progressBarX}" y="57" width="${layout.barFilledWidth}" height="8" rx="4" fill="url(#progress-grad)" />

        <!-- Progress Percentage Text -->
        <text x="796" y="68" font-size="17" font-weight="600" fill="#1A5096">${progressPercent}%</text>`;

    output = output.replace(
      /(?:<!-- [^\n]*Rank Badge[^\n]*\n\s*)?<g transform="translate\(30, 63\)">[\s\S]*?<text x="796" y="68"[^>]*>[\s\S]*?<\/text>/,
      progressionSvg
    );
  }

  // 8. Time Breakdown
  if (data.timeBreakdown?.camMinutes !== undefined && data.timeBreakdown?.nonCamMinutes !== undefined) {
    const camMins = data.timeBreakdown.camMinutes;
    const nonCamMins = data.timeBreakdown.nonCamMinutes;
    const totalMins = camMins + nonCamMins;

    const camHoursStr = formatDurationHours(camMins);
    const camPercentStr = totalMins > 0 ? `${Math.round((camMins / totalMins) * 100)}%` : '0%';
    output = output.replace(
      /(<!-- Card 1: CAM HOURS -->[\s\S]*?<text x="229" y="33\.5" text-anchor="middle" font-size="13" font-weight="700" fill=")[^"]*(")[^<]*(<\/text>[\s\S]*?<text x="24" y="76" font-size="31" class="stat-num">)[^<]*(<\/text>)/,
      `$1#5BB996$2>${escapeXmlText(camPercentStr)}$3${escapeXmlText(camHoursStr)}$4`
    );

    const nonCamHoursStr = formatDurationHoursAndMins(nonCamMins);
    const nonCamPercentStr = totalMins > 0 ? `${Math.round((nonCamMins / totalMins) * 100)}%` : '0%';
    output = output.replace(
      /(<!-- Card 2: NON CAM HOURS -->[\s\S]*?<text x="229" y="33\.5" text-anchor="middle" font-size="13" font-weight="700" fill=")[^"]*(")[^<]*(<\/text>[\s\S]*?<text x="24" y="76" font-size="31" class="stat-num">)[^<]*(<\/text>)/,
      `$1#F97316$2>${escapeXmlText(nonCamPercentStr)}$3${escapeXmlText(nonCamHoursStr)}$4`
    );

    const overallHoursStr = formatDurationHoursAndMins(totalMins);
    output = output.replace(
      /(<!-- Card 3: OVERALL HOURS -->[\s\S]*?<text x="24" y="76" font-size="31" font-weight="700" fill=")[^"]*(" letter-spacing="-0.02em">)[^<]*(<\/text>)/,
      `$1#8E7AC5$2${escapeXmlText(overallHoursStr)}$3`
    );
  }

  // 9. Activity (Last 7 Days)
  const periodLabel = data.activity?.periodLabel ?? 'LAST 7 DAYS';
  output = output.replace(
    /(<text x="49" y="30" class="sub-header">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(periodLabel)}$2`
  );

  const xPositions = [
    { textX: 41.5, barX: 29 },
    { textX: 111.5, barX: 99 },
    { textX: 181.5, barX: 169 },
    { textX: 250.5, barX: 238 },
    { textX: 321.5, barX: 309 },
    { textX: 390.5, barX: 378 },
    { textX: 460.5, barX: 448 },
  ];

  if (data.activity?.entries && data.activity.entries.length === 7) {
    const entries = data.activity.entries;
    const maxMinutes = Math.max(...entries.map((d) => d.durationMinutes), 600);
    const hasCurrentDayFlag = entries.some(
      (d) => d.isCurrentDay !== undefined || d.highlight !== undefined
    );

    let barsMarkup = '';
    entries.forEach((d, idx) => {
      const pos = xPositions[idx]!;
      const minutes = d.durationMinutes;
      const height = Math.min(80, Math.max(10, Math.round((minutes / maxMinutes) * 80)));
      const y = 130 - height; // baseline at y=130
      const textY = y - 9;
      const durationStr = formatActivityDuration(minutes);
      const isHighlight = hasCurrentDayFlag
        ? Boolean(d.isCurrentDay ?? d.highlight)
        : idx === 6;
      const fill = isHighlight ? 'url(#bar-active)' : 'url(#bar-lavender)';

      barsMarkup += `\n      <!-- Bar ${idx + 1}: ${escapeXmlText(d.label)} (${escapeXmlText(durationStr)}) -->
      <text x="${pos.textX}" y="${textY}" text-anchor="middle" class="chart-text">${escapeXmlText(durationStr)}</text>
      <rect x="${pos.barX}" y="${y}" width="25" height="${height}" rx="4" fill="${fill}" />
      <text x="${pos.textX}" y="147" text-anchor="middle" class="chart-text">${escapeXmlText(d.label)}</text>`;
    });

    const barsBlockRegex = /<!-- Bar 1: Mon [\s\S]*?<!-- Bar 7: Sun [\s\S]*?<text x="460\.5" y="147" text-anchor="middle" class="chart-text">Sun<\/text>/;
    output = output.replace(barsBlockRegex, barsMarkup.trim());
  } else if (data.last7Days && data.last7Days.length === 7) {
    // Legacy last7Days mapping
    const maxMinutes = Math.max(...data.last7Days.map((d) => d.minutes ?? 60), 600);
    let barsMarkup = '';
    data.last7Days.forEach((d, idx) => {
      const pos = xPositions[idx]!;
      const minutes = d.minutes ?? 60;
      const height = Math.min(80, Math.max(10, Math.round((minutes / maxMinutes) * 80)));
      const y = 130 - height;
      const textY = y - 9;
      const fill = d.highlight ? 'url(#bar-active)' : 'url(#bar-lavender)';

      barsMarkup += `\n      <!-- Bar ${idx + 1}: ${escapeXmlText(d.day)} (${escapeXmlText(d.duration)}) -->
      <text x="${pos.textX}" y="${textY}" text-anchor="middle" class="chart-text">${escapeXmlText(d.duration)}</text>
      <rect x="${pos.barX}" y="${y}" width="25" height="${height}" rx="4" fill="${fill}" />
      <text x="${pos.textX}" y="147" text-anchor="middle" class="chart-text">${escapeXmlText(d.day)}</text>`;
    });

    const barsBlockRegex = /<!-- Bar 1: Mon [\s\S]*?<!-- Bar 7: Sun [\s\S]*?<text x="460\.5" y="147" text-anchor="middle" class="chart-text">Sun<\/text>/;
    output = output.replace(barsBlockRegex, barsMarkup.trim());
  }

  return output;
}
