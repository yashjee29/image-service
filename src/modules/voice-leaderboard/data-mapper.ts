import { escapeXmlText } from '../../core/svg/svg-escaping.js';
import { rankAssetCache } from '../../core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../../core/images/leaderboard-asset-cache.js';
import { getRankTheme, isHighTierRank, REQUESTER_HIGHLIGHT_THEME } from './config.js';
import type { VoiceLeaderboardInput, LeaderboardEntry } from './schema.js';

export interface LeaderboardAvatarMap {
  [rank: number]: string; // rank -> base64 dataUri
}

export const RANK_TEXT_WIDTHS_16: Record<string, number> = {
  iron: 29,
  bronze: 53,
  silver: 42,
  gold: 37,
  platinum: 70,
  diamond: 73,
  ascendant: 87,
  immortal: 73,
  radiant: 62,
  unrated: 63,
  unranked: 63,
};

export const RANK_TEXT_WIDTHS_21: Record<string, number> = {
  iron: 39,
  bronze: 70,
  silver: 56,
  gold: 48,
  platinum: 93,
  diamond: 96,
  ascendant: 115,
  immortal: 96,
  radiant: 82,
  unrated: 83,
  unranked: 83,
};

export function getRankTextWidth(rankName: string, fontSize: number): number {
  const key = rankName.toLowerCase().trim();
  if (fontSize === 16 && RANK_TEXT_WIDTHS_16[key]) return RANK_TEXT_WIDTHS_16[key]!;
  if (fontSize === 21 && RANK_TEXT_WIDTHS_21[key]) return RANK_TEXT_WIDTHS_21[key]!;
  return estimateTextWidth(rankName, fontSize);
}

/**
 * Estimates text width for Plus Jakarta Sans / Nunito Sans font.
 */
export function estimateTextWidth(text: string, fontSize = 21): number {
  let width = 0;
  for (const char of text) {
    if (/[il1.,'|:;! ]/.test(char)) {
      width += fontSize * 0.30;
    } else if (/[fjrtI]/.test(char)) {
      width += fontSize * 0.42;
    } else if (/[mwMW]/.test(char)) {
      width += fontSize * 0.95;
    } else if (/[A-Z]/.test(char)) {
      width += fontSize * 0.76;
    } else if (/[0-9]/.test(char)) {
      width += fontSize * 0.62;
    } else {
      width += fontSize * 0.60;
    }
  }
  return Math.ceil(width);
}

/**
 * Estimates text width for usernames.
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
 * Fits username within available space:
 * 1. Tries decreasing font sizes.
 * 2. If it still overflows, truncates with "..." at the end.
 */
export function fitUsername(
  rawName: string,
  maxWidth = 300,
  fontSizes = [33, 29, 26, 23]
): { displayName: string; fontSize: number; width: number } {
  for (const size of fontSizes) {
    const w = estimateNameWidth(rawName, size);
    if (w <= maxWidth) {
      return { displayName: rawName, fontSize: size, width: w };
    }
  }

  const minSize = fontSizes[fontSizes.length - 1]!;
  for (let len = rawName.length - 1; len >= 1; len--) {
    const candidate = rawName.substring(0, len) + '...';
    const w = estimateNameWidth(candidate, minSize);
    if (w <= maxWidth) {
      return { displayName: candidate, fontSize: minSize, width: w };
    }
  }
  return { displayName: '...', fontSize: minSize, width: estimateNameWidth('...', minSize) };
}

/**
 * Formats duration following the exact profile algorithm:
 * "if there is exact same hour like 0h 00m or 5h 00 m then only hours should be showed not minutes"
 */
export function formatLeaderboardHours(durationMinutes?: number, rawHours?: string): string {
  if (durationMinutes !== undefined) {
    const hours = Math.floor(durationMinutes / 60);
    const remainingMins = Math.round(durationMinutes % 60);
    const hoursFormatted = hours.toLocaleString('en-US');
    if (remainingMins === 0) {
      return `${hoursFormatted}h`;
    }
    const mStr = remainingMins < 10 ? `0${remainingMins}` : `${remainingMins}`;
    return `${hoursFormatted}h ${mStr}m`;
  }

  if (rawHours) {
    const trimmed = rawHours.trim();
    const exactMatch = trimmed.match(/^(\d+(?:,\d+)?)\s*h(?:\s*00?m)?$/i);
    if (exactMatch) {
      return `${exactMatch[1]}h`;
    }
    const fullMatch = trimmed.match(/^(\d+(?:,\d+)?)\s*h\s*(\d+)m$/i);
    if (fullMatch) {
      const m = parseInt(fullMatch[2]!, 10);
      if (m === 0) {
        return `${fullMatch[1]}h`;
      }
      return `${fullMatch[1]}h ${m < 10 ? '0' : ''}${m}m`;
    }
    return trimmed;
  }

  return '0h';
}

/**
 * Removes an SVG element or group by its id, properly handling nested tags for container elements
 * as well as self-closing tags (<rect />, <line />, <path />).
 */
export function removeSvgElementById(svg: string, id: string): string {
  const startIdx = svg.indexOf(`id="${id}"`);
  if (startIdx === -1) return svg;

  // Find the opening '<' for this element tag
  const tagStart = svg.lastIndexOf('<', startIdx);
  if (tagStart === -1) return svg;

  // Extract tag name (e.g. "g", "rect", "line", "path", "circle")
  const match = svg.slice(tagStart).match(/^<([a-zA-Z0-9:_-]+)/);
  if (!match) return svg;
  const tagName = match[1];

  // Check if self-closing tag (e.g. <rect ... /> or <line ... />)
  const firstClose = svg.indexOf('>', tagStart);
  if (firstClose !== -1 && svg[firstClose - 1] === '/') {
    let endIdx = firstClose + 1;
    while (endIdx < svg.length && (svg[endIdx] === ' ' || svg[endIdx] === '\t' || svg[endIdx] === '\n' || svg[endIdx] === '\r')) {
      endIdx++;
    }
    return svg.slice(0, tagStart) + svg.slice(endIdx);
  }

  // Container tag (<tagName ...> ... </tagName>)
  const openPattern = `<${tagName}`;
  const closePattern = `</${tagName}>`;
  let depth = 0;
  let i = tagStart;
  while (i < svg.length) {
    if (svg.startsWith(openPattern, i) && (svg[i + openPattern.length] === ' ' || svg[i + openPattern.length] === '>' || svg[i + openPattern.length] === '/')) {
      const subClose = svg.indexOf('>', i);
      if (subClose !== -1 && svg[subClose - 1] === '/') {
        i = subClose + 1;
        continue;
      }
      depth++;
      i += openPattern.length;
    } else if (svg.startsWith(closePattern, i)) {
      depth--;
      if (depth === 0) {
        let tagEnd = i + closePattern.length;
        while (tagEnd < svg.length && (svg[tagEnd] === ' ' || svg[tagEnd] === '\t' || svg[tagEnd] === '\n' || svg[tagEnd] === '\r')) {
          tagEnd++;
        }
        return svg.slice(0, tagStart) + svg.slice(tagEnd);
      }
      i += closePattern.length;
    } else {
      i++;
    }
  }

  return svg;
}

/**
 * Formats monthly label by abbreviating long month names (>5 letters)
 * to 3 letters (e.g. October -> Oct, December -> Dec, January -> Jan),
 * while keeping short/medium months (March, April, May, June, July) in full.
 */
export function formatMonthlyLabel(rawLabel: string): string {
  if (!rawLabel) return 'Monthly';
  const trimmed = rawLabel.trim();
  const lower = trimmed.toLowerCase();

  const monthMap: Record<string, string> = {
    january: 'Jan',
    jan: 'Jan',
    february: 'Feb',
    feb: 'Feb',
    march: 'March',
    mar: 'March',
    april: 'April',
    apr: 'April',
    may: 'May',
    june: 'June',
    jun: 'June',
    july: 'July',
    jul: 'July',
    august: 'Aug',
    aug: 'Aug',
    september: 'Sep',
    sept: 'Sep',
    sep: 'Sep',
    october: 'Oct',
    oct: 'Oct',
    november: 'Nov',
    nov: 'Nov',
    december: 'Dec',
    dec: 'Dec',
  };

  if (monthMap[lower]) {
    const rep = monthMap[lower]!;
    return trimmed === trimmed.toUpperCase() ? rep.toUpperCase() : rep;
  }

  return trimmed.replace(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    (match) => {
      const rep = monthMap[match.toLowerCase()];
      return rep ? (match === match.toUpperCase() ? rep.toUpperCase() : rep) : match;
    }
  );
}

export function renderHeaderMetricIcon(metric: string, iconX: number, iconY: number): string {
  const m = metric.toLowerCase();
  if (m.includes('non') || m.includes('voice') || m.includes('audio')) {
    // Microphone icon for NON-CAM (purple/indigo)
    return `<g id="metric-icon-mic">
      <rect x="${iconX + 6}" y="${iconY + 1}" width="12" height="16" rx="6" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.8" />
      <path d="M${iconX + 2} ${iconY + 10} C${iconX + 2} ${iconY + 19} ${iconX + 22} ${iconY + 19} ${iconX + 22} ${iconY + 10}" fill="none" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" />
      <path d="M${iconX + 12} ${iconY + 19} L${iconX + 12} ${iconY + 24} M${iconX + 6} ${iconY + 24} L${iconX + 18} ${iconY + 24}" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" />
    </g>`;
  } else if (m.includes('both') || m.includes('total') || m.includes('all')) {
    // Camera with Audio Soundwaves for BOTH (amber/orange)
    return `<g id="metric-icon-both">
      <rect x="${iconX}" y="${iconY + 4}" width="20" height="17" rx="4" fill="#ffedd5" stroke="#ea580c" stroke-width="1.5" />
      <circle cx="${iconX + 10}" cy="${iconY + 12.5}" r="4" fill="#fff" stroke="#ea580c" stroke-width="1.4" />
      <path d="M${iconX + 20} ${iconY + 8} L${iconX + 27} ${iconY + 3} L${iconX + 27} ${iconY + 22} L${iconX + 20} ${iconY + 17} Z" fill="#fdba74" stroke="#ea580c" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M${iconX + 30} ${iconY + 8} C${iconX + 33} ${iconY + 10} ${iconX + 33} ${iconY + 15} ${iconX + 30} ${iconY + 17}" fill="none" stroke="#ea580c" stroke-width="1.6" stroke-linecap="round" />
      <path d="M${iconX + 33.5} ${iconY + 5} C${iconX + 37.5} ${iconY + 9} ${iconX + 37.5} ${iconY + 16} ${iconX + 33.5} ${iconY + 20}" fill="none" stroke="#ea580c" stroke-width="1.6" stroke-linecap="round" />
    </g>`;
  } else {
    // Camera icon for CAM HOURS (emerald green)
    return `<g id="metric-icon-cam">
      <rect x="${iconX}" y="${iconY + 4}" width="25" height="18" rx="4" fill="#bcebd1" stroke="#5aaf83" stroke-width="1.5" />
      <rect x="${iconX + 5}" y="${iconY}" width="10" height="5" rx="2" fill="#79cba0" stroke="none" />
      <path d="M${iconX + 25} ${iconY + 8} L${iconX + 36} ${iconY + 1} L${iconX + 36} ${iconY + 24} L${iconX + 25} ${iconY + 17} Z" fill="#8ed8b0" stroke="#5aaf83" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${iconX + 12}" cy="${iconY + 13}" r="4.5" fill="#fff" stroke="#5aaf83" stroke-width="1.5" />
    </g>`;
  }
}

export function buildHeaderMetricBox(
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  category: string
): string {
  const m = category.toLowerCase();
  const iconW = m.includes('both') || m.includes('total') || m.includes('all')
    ? 37
    : (m.includes('non') || m.includes('voice') || m.includes('audio') ? 24 : 36);
  const gap = 12;
  const tw = estimateTextWidth(category, 20);
  const totalContentW = iconW + gap + tw;
  const startX = Math.round(boxX + (boxW - totalContentW) / 2);
  const iconY = Math.round(boxY + (boxH - 26) / 2);
  const textX = startX + iconW + gap;
  const textY = boxY + 44;

  return `<g id="header-metric-box">
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="16" fill="#fffdfa" stroke="#eadfd7" stroke-width="1" />
    ${renderHeaderMetricIcon(category, startX, iconY)}
    <text x="${textX}" y="${textY}" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="20" font-weight="600" fill="#14191f" text-anchor="start">${escapeXmlText(category)}</text>
  </g>`;
}

export function buildHeaderPeriodBox(
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  rawPeriod: string
): string {
  const formattedPeriod = formatMonthlyLabel(rawPeriod);
  const calW = 25;
  const gap = 12;
  const tw = estimateTextWidth(formattedPeriod, 20);
  const totalContentW = calW + gap + tw;
  const startX = Math.round(boxX + (boxW - totalContentW) / 2);
  const calY = Math.round(boxY + (boxH - 26) / 2);
  const textX = startX + calW + gap;
  const textY = boxY + 44;

  const calSvg = `
    <rect x="${startX}" y="${calY}" width="25" height="26" rx="4" fill="none" stroke="#f26c5f" stroke-width="2" />
    <path d="M${startX} ${calY + 8} L${startX + 25} ${calY + 8} M${startX + 6} ${calY - 4} L${startX + 6} ${calY + 4} M${startX + 19} ${calY - 4} L${startX + 19} ${calY + 4}" fill="none" stroke="#f26c5f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${startX + 7}" cy="${calY + 14}" r="1.5" fill="#f26c5f" />
    <circle cx="${startX + 12.5}" cy="${calY + 14}" r="1.5" fill="#f26c5f" />
    <circle cx="${startX + 18}" cy="${calY + 14}" r="1.5" fill="#f26c5f" />
    <circle cx="${startX + 7}" cy="${calY + 20}" r="1.5" fill="#f26c5f" />
    <circle cx="${startX + 12.5}" cy="${calY + 20}" r="1.5" fill="#f26c5f" />
    <circle cx="${startX + 18}" cy="${calY + 20}" r="1.5" fill="#f26c5f" />
  `;

  return `<g id="header-period-box">
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="16" fill="#fffdfa" stroke="#eadfd7" stroke-width="1" />
    ${calSvg}
    <text x="${textX}" y="${textY}" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="20" font-weight="600" fill="#14191f" text-anchor="start">${escapeXmlText(formattedPeriod)}</text>
  </g>`;
}

export function buildHeaderSubtitleBadge(
  startX: number,
  startY: number,
  _category?: string
): string {
  // Always fixed to "CAM HOURS" for all leaderboards regardless of cam or non-cam mode
  const bgFill = '#eaf4ee';
  const bgStroke = '#d5e5dc';
  const textFill = '#0e6c55';

  const pillW = 151;
  const pillX = startX + 297;
  const textX = pillX + 75.5;
  const onlyX = pillX + pillW + 12;

  return `<g id="header-category-badge">
    <text x="${startX}" y="${startY + 26}" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="20" font-weight="600" fill="#62636c" text-anchor="start" letter-spacing="1">HALL OF FAME DECIDED BY</text>
    <rect x="${pillX}" y="${startY}" width="${pillW}" height="37" rx="18.5" fill="${bgFill}" stroke="${bgStroke}" stroke-width="1" />
    <text x="${textX}" y="${startY + 26}" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="20" font-weight="700" fill="${textFill}" text-anchor="middle">CAM HOURS</text>
    <text x="${onlyX}" y="${startY + 26}" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="20" font-weight="600" fill="#62636c" text-anchor="start">ONLY.</text>
  </g>`;
}

/**
 * Maps data for the 1536x1024 Study Leaderboard template.
 */
export function mapStudyLeaderboardData(
  templateContent: string,
  data: VoiceLeaderboardInput,
  avatarMap: LeaderboardAvatarMap = {}
): string {
  let output = templateContent;

  // 1. Header Replacements
  if (data.title) {
    output = output.replace(
      /<text x="234" y="93"[^>]*>[^<]*<\/text>/,
      `<text x="234" y="93" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="53" font-weight="800" fill="#15191f" text-anchor="start">${escapeXmlText(data.title)}</text>`
    );
  }

  const category = data.category ?? 'CAM HOURS';
  const period = data.period ?? 'Monthly';

  // Subtitle Badge
  output = output.replace(
    new RegExp(`<g id="header-category-badge">[\\s\\S]*?<\\/g>`),
    buildHeaderSubtitleBadge(234, 111, category)
  );

  // Box 1 (Metric)
  output = output.replace(
    new RegExp(`<g id="header-metric-box">[\\s\\S]*?<\\/g>`),
    buildHeaderMetricBox(958, 50, 252, 70, category)
  );

  // Box 2 (Period)
  output = output.replace(
    new RegExp(`<g id="header-period-box">[\\s\\S]*?<\\/g>`),
    buildHeaderPeriodBox(1229, 50, 211, 70, period)
  );

  const entriesByRank = new Map<number, LeaderboardEntry>();
  for (const entry of data.entries) {
    entriesByRank.set(entry.rank, entry);
  }

  // 2. Podium Cards (#1, #2, #3)
  const medalCoords: Record<number, { x: number; y: number; size: number }> = {
    1: { x: 712, y: 163, size: 46 },
    2: { x: 306, y: 175, size: 46 },
    3: { x: 1104, y: 175, size: 46 },
  };

  const podiumCardConfig: Record<number, { cx: number; maxNameWidth: number; slug: string }> = {
    1: { cx: 771, maxNameWidth: 300, slug: 'avatar-aarav' },
    2: { cx: 363, maxNameWidth: 280, slug: 'avatar-sakha' },
    3: { cx: 1163, maxNameWidth: 270, slug: 'avatar-mira' },
  };

  for (let rank = 1; rank <= 3; rank++) {
    const entry = entriesByRank.get(rank);
    if (!entry) {
      output = removeSvgElementById(output, `podium-card-${rank}`);
      continue;
    }

    const medalUri = leaderboardAssetCache.getMedalDataUri(rank);
    if (medalUri) {
      const coord = medalCoords[rank]!;
      const medalImgTag = `<g id="podium-medal-${rank}">
        <image href="${medalUri}" x="${coord.x}" y="${coord.y}" width="${coord.size}" height="${coord.size}" preserveAspectRatio="xMidYMid meet" />
      </g>`;
      output = output.replace(
        new RegExp(`<g id="podium-medal-${rank}">[\\s\\S]*?<\\/g>`),
        medalImgTag
      );
    }

    const conf = podiumCardConfig[rank]!;
    const rankTheme = getRankTheme(entry.rankId);
    const isHighTier = isHighTierRank(entry.rankId);
    const rankIconUri = rankAssetCache.getRankDataUri(entry.rankId ?? rankTheme.id, 80);
    const rankName = entry.rankName ?? rankTheme.name;
    const hoursFormatted = formatLeaderboardHours(entry.durationMinutes, entry.hours ?? entry.camHours);
    const fitting = fitUsername(entry.username, conf.maxNameWidth, [33, 29, 26, 23]);
    const escapedName = escapeXmlText(fitting.displayName);
    const escapedHours = escapeXmlText(hoursFormatted);

    const isRequester = Boolean(entry.isCurrentUser);

    // 3a. Card Border Stroke
    const cardBorderColor = isRequester ? REQUESTER_HIGHLIGHT_THEME.cardBorder : rankTheme.cardBorder;
    const cardStrokeWidth = isRequester ? '2.2' : '1.2';
    output = output.replace(
      new RegExp(`(id="podium-card-rect-${rank}"[^>]*stroke=")[^"]*("[^>]*stroke-width=")[^"]*(")`),
      `$1${cardBorderColor}$2${cardStrokeWidth}$3`
    );

    // 3b. Outer Avatar Ring Stroke
    output = output.replace(
      new RegExp(`(<circle cx="${conf.cx}" cy="319" r="84" fill="none" stroke=")[^"]*(")`),
      `$1${cardBorderColor}$2`
    );

    // 3c. Username
    const nameWeight = isRequester ? '900' : '800';
    const nameColor = isRequester ? REQUESTER_HIGHLIGHT_THEME.nameColor : '#171b20';
    output = output.replace(
      new RegExp(`(id="podium-user-${rank}"[^>]*font-size=")[^"]*("[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*("[^>]*>)[^<]*(<)`),
      `$1${fitting.fontSize}$2${nameWeight}$3${nameColor}$4${escapedName}$5`
    );

    // 3d. Hours Text
    const hoursWeight = isRequester ? '900' : '800';
    const hoursColor = isRequester ? rankTheme.darkerColor : rankTheme.primaryColor;
    output = output.replace(
      new RegExp(`(id="podium-hours-${rank}"[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*("[^>]*>)[^<]*(<)`),
      `$1${hoursWeight}$2${hoursColor}$3${escapedHours}$4`
    );

    // 3e. Top Badge Rank Number & Pill
    if (isRequester) {
      output = output.replace(
        new RegExp(`(id="podium-top-pill-${rank}"[^>]*fill=")[^"]*("[^>]*stroke=")[^"]*("[^>]*stroke-width=")[^"]*(")`),
        `$1${REQUESTER_HIGHLIGHT_THEME.rankBoxBg}$2${REQUESTER_HIGHLIGHT_THEME.rankBoxBorder}$3${REQUESTER_HIGHLIGHT_THEME.rankBoxStrokeWidth}$4`
      );
      output = output.replace(
        new RegExp(`(id="podium-rank-num-${rank}"[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*(")`),
        `$1900$2${REQUESTER_HIGHLIGHT_THEME.rankNumColor}$3`
      );
    } else {
      output = output.replace(
        new RegExp(`(id="podium-rank-num-${rank}"[^>]*fill=")[^"]*(")`),
        `$1${rankTheme.primaryColor}$2`
      );
    }

    // 3f. Centered Rank Pill (High quality crisp icons, strictly equal horizontal padding)
    const tw = getRankTextWidth(rankName, 21);
    const iconSize = isHighTier ? 40 : 38;
    const pad = 16;
    const gap = 10;
    const pillW = pad + iconSize + gap + tw + pad;
    const pillX = conf.cx - pillW / 2;
    const iconX = pillX + pad;
    const iconY = 457 + (45 - iconSize) / 2;
    const textX = iconX + iconSize + gap;

    const rankPillSvg = `<g id="podium-rank-pill-${rank}">
      <rect x="${pillX}" y="457" width="${pillW}" height="45" rx="22.5" fill="${rankTheme.pillBg}" stroke="${rankTheme.pillBorder}" stroke-width="1" />
      ${rankIconUri ? `<image href="${rankIconUri}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet" />` : ''}
      <text x="${textX}" y="486.5" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="21" font-weight="500" fill="${rankTheme.pillTextColor}" text-anchor="start">${escapeXmlText(rankName)}</text>
    </g>`;

    output = output.replace(
      new RegExp(`<g id="podium-rank-pill-${rank}">[\\s\\S]*?<\\/g>`),
      rankPillSvg
    );

    // 3g. Custom Avatar
    const avatarUri = avatarMap[rank];
    if (avatarUri) {
      const avatarSvg = `<g id="${conf.slug}">
        <clipPath id="podium-avatar-clip-${rank}"><circle cx="${conf.cx}" cy="319" r="80" /></clipPath>
        <image href="${avatarUri}" x="${conf.cx - 80}" y="${319 - 80}" width="160" height="160" clip-path="url(#podium-avatar-clip-${rank})" preserveAspectRatio="xMidYMid slice" />
      </g>`;

      output = output.replace(
        new RegExp(`<g id="${conf.slug}"[\\s\\S]*?<\\/g>`),
        avatarSvg
      );
    }
  }

  // 4. Table Rows (Ranks 4 to 11)
  const rowAvatarSlugs: Record<number, string> = {
    4: 'avatar-pixeldreams',
    5: 'avatar-kabir',
    6: 'avatar-anaya',
    7: 'avatar-dev',
    8: 'avatar-isha',
    9: 'avatar-neel',
    10: 'avatar-tara',
    11: 'avatar-hexcode',
  };

  const remainingEntries = data.entries.filter((e) => e.rank > 3);
  const slotEntryMap = new Map<number, LeaderboardEntry>();

  for (let slotRank = 4; slotRank <= 11; slotRank++) {
    const entry = entriesByRank.get(slotRank) ?? remainingEntries[slotRank - 4];
    if (entry) {
      slotEntryMap.set(slotRank, entry);
    }
  }

  // Handle Column 1 (slots 4, 5, 6, 7)
  const col1Slots = [4, 5, 6, 7].filter((s) => slotEntryMap.has(s));
  if (col1Slots.length === 0) {
    output = removeSvgElementById(output, 'study-table-col-1');
    for (const s of [4, 5, 6, 7]) {
      output = removeSvgElementById(output, `study-row-${s}`);
    }
    for (const s of [4, 5, 6]) {
      output = removeSvgElementById(output, `study-divider-${s}`);
    }
  } else {
    for (const s of [4, 5, 6, 7]) {
      if (!slotEntryMap.has(s)) {
        output = removeSvgElementById(output, `study-row-${s}`);
      }
    }
    for (const s of [4, 5, 6]) {
      if (!slotEntryMap.has(s) || !slotEntryMap.has(s + 1)) {
        output = removeSvgElementById(output, `study-divider-${s}`);
      }
    }
    const podiumColHeights: Record<number, number> = { 1: 87, 2: 169, 3: 251, 4: 334 };
    const h1 = podiumColHeights[col1Slots.length] ?? 334;
    output = output.replace(
      /(id="study-table-col-1"[^>]*height=")[^"]*(")/,
      `$1${h1}$2`
    );
  }

  // Handle Column 2 (slots 8, 9, 10, 11)
  const col2Slots = [8, 9, 10, 11].filter((s) => slotEntryMap.has(s));
  if (col2Slots.length === 0) {
    output = removeSvgElementById(output, 'study-table-col-2');
    for (const s of [8, 9, 10, 11]) {
      output = removeSvgElementById(output, `study-row-${s}`);
    }
    for (const s of [8, 9, 10]) {
      output = removeSvgElementById(output, `study-divider-${s}`);
    }
  } else {
    for (const s of [8, 9, 10, 11]) {
      if (!slotEntryMap.has(s)) {
        output = removeSvgElementById(output, `study-row-${s}`);
      }
    }
    for (const s of [8, 9, 10]) {
      if (!slotEntryMap.has(s) || !slotEntryMap.has(s + 1)) {
        output = removeSvgElementById(output, `study-divider-${s}`);
      }
    }
    const podiumColHeights: Record<number, number> = { 1: 87, 2: 169, 3: 251, 4: 334 };
    const h2 = podiumColHeights[col2Slots.length] ?? 334;
    output = output.replace(
      /(id="study-table-col-2"[^>]*height=")[^"]*(")/,
      `$1${h2}$2`
    );
  }

  for (const [slotRank, entry] of slotEntryMap.entries()) {

    const rankTheme = getRankTheme(entry.rankId);
    const isHighTier = isHighTierRank(entry.rankId);
    const rankIconUri = rankAssetCache.getRankDataUri(entry.rankId ?? rankTheme.id, 80);
    const rankName = entry.rankName ?? rankTheme.name;
    const hoursFormatted = formatLeaderboardHours(entry.durationMinutes, entry.hours ?? entry.camHours);

    const isCol1 = slotRank <= 7;
    const rowY = (slotRank === 4 || slotRank === 8)
      ? 660
      : (slotRank === 5 || slotRank === 9)
      ? 742
      : (slotRank === 6 || slotRank === 10)
      ? 824
      : 906;

    // Dynamic collision-free sizing for rank pill & username with strictly equal horizontal padding
    const iconSize = isHighTier ? 36 : 33;
    const tw = getRankTextWidth(rankName, 16);
    const pad = 12;
    const gap = 8;
    const pillW = pad + iconSize + gap + tw + 14;

    const hoursEndX = isCol1 ? 728 : 1374;
    const hoursW = estimateTextWidth(hoursFormatted, 25);
    const hoursLeft = hoursEndX - hoursW;
    const maxPillRight = hoursLeft - 14;

    const defaultPillX = isCol1 ? 496 : 1142;
    const pillX = (defaultPillX + pillW > maxPillRight) ? maxPillRight - pillW : defaultPillX;
    const pillY = rowY + 6;
    const iconX = pillX + pad;
    const iconY = pillY + (42 - iconSize) / 2;
    const textX = iconX + iconSize + gap;

    const userStartX = isCol1 ? 324 : 970;
    const maxNameW = Math.max(80, (pillX - 12) - userStartX);
    const fitting = fitUsername(entry.username, maxNameW, [23, 20, 18, 16]);
    const escapedName = escapeXmlText(fitting.displayName);
    const escapedHours = escapeXmlText(hoursFormatted);

    const isRequester = Boolean(entry.isCurrentUser);

    // 4a. Rank Number Text
    const rankWeight = isRequester ? '900' : '500';
    const rankNumColor = isRequester ? REQUESTER_HIGHLIGHT_THEME.rankNumColor : '#172027';
    output = output.replace(
      new RegExp(`(id="study-rank-num-${slotRank}"[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*("[^>]*>)[^<]*(<)`),
      `$1${rankWeight}$2${rankNumColor}$3${entry.rank}$4`
    );

    // 4b. Username Text
    const nameWeight = isRequester ? '900' : '500';
    const nameColor = isRequester ? REQUESTER_HIGHLIGHT_THEME.nameColor : '#11171b';
    output = output.replace(
      new RegExp(`(id="study-user-${slotRank}"[^>]*font-size=")[^"]*("[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*("[^>]*>)[^<]*(<)`),
      `$1${fitting.fontSize}$2${nameWeight}$3${nameColor}$4${escapedName}$5`
    );

    // 4c. Hours Text
    const hoursWeight = isRequester ? '900' : '700';
    const hoursColor = isRequester ? rankTheme.darkerColor : rankTheme.primaryColor;
    output = output.replace(
      new RegExp(`(id="study-hours-${slotRank}"[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*("[^>]*>)[^<]*(<)`),
      `$1${hoursWeight}$2${hoursColor}$3${escapedHours}$4`
    );

    // 4d. Rank Pill
    const rankPillSvg = `<g id="study-rank-pill-${slotRank}">
      <rect x="${pillX}" y="${pillY}" width="${pillW}" height="42" rx="21" fill="${rankTheme.pillBg}" stroke="${rankTheme.pillBorder}" stroke-width="1" />
      ${rankIconUri ? `<image href="${rankIconUri}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet" />` : ''}
      <text x="${textX}" y="${pillY + 27}" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="16" font-weight="500" fill="${rankTheme.pillTextColor}" text-anchor="start">${escapeXmlText(rankName)}</text>
    </g>`;

    output = output.replace(
      new RegExp(`<g id="study-rank-pill-${slotRank}">[\\s\\S]*?<\\/g>`),
      rankPillSvg
    );

    // 4e. Custom Avatar
    const avatarUri = avatarMap[entry.rank];
    const avatarSlug = rowAvatarSlugs[slotRank]!;
    if (avatarUri) {
      const avatarCx = isCol1 ? 262 : 908;
      const avatarCy = rowY + 27;
      const avatarSvg = `<g id="${avatarSlug}">
        <clipPath id="study-avatar-clip-${slotRank}"><circle cx="${avatarCx}" cy="${avatarCy}" r="36" /></clipPath>
        <image href="${avatarUri}" x="${avatarCx - 36}" y="${avatarCy - 36}" width="72" height="72" clip-path="url(#study-avatar-clip-${slotRank})" preserveAspectRatio="xMidYMid slice" />
      </g>`;

      output = output.replace(
        new RegExp(`<g id="${avatarSlug}"[\\s\\S]*?<\\/g>`),
        avatarSvg
      );
    }

    // 4f. Current User Highlight
    if (isRequester) {
      const boxX = isCol1 ? 145 : 791;
      output = output.replace(
        new RegExp(`<rect x="${boxX}" y="${rowY}" width="55" height="54" rx="11" fill="[^"]*" stroke="[^"]*" stroke-width="[^"]*"`),
        `<rect x="${boxX}" y="${rowY}" width="55" height="54" rx="11" fill="${REQUESTER_HIGHLIGHT_THEME.rankBoxBg}" stroke="${REQUESTER_HIGHLIGHT_THEME.rankBoxBorder}" stroke-width="${REQUESTER_HIGHLIGHT_THEME.rankBoxStrokeWidth}"`
      );
    }
  }

  if (data.entries.length === 0) {
    const emptyStateSvg = `  <g id="study-empty-state">
    <rect x="448" y="380" width="640" height="260" rx="24" fill="#ffffff" stroke="#eadfd7" stroke-width="1.5" />
    <circle cx="768" cy="455" r="36" fill="#fff7ed" stroke="#fed7aa" stroke-width="1.5" />
    <path d="M756 450 C748 450 746 458 758 462 M780 450 C788 450 790 458 778 462" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M764 470 L764 475 L758 480 L778 480 L772 475 L772 470 Z" fill="#fdba74" stroke="#ea580c" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M755 446 L781 446 L779 462 Q777 470 768 470 Q759 470 757 462 Z" fill="#fb923c" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <text x="768" y="530" font-family="Plus Jakarta Sans, Nunito, Arial, sans-serif" font-size="28" font-weight="800" fill="#2d2118" text-anchor="middle">No Study Records Yet</text>
    <text x="768" y="568" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="20" font-weight="600" fill="#7d6a5e" text-anchor="middle">No voice or study activity has been recorded for this period.</text>
    <text x="768" y="598" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="17" font-weight="500" fill="#a8988e" text-anchor="middle">Join a voice channel or start a session to claim the #1 spot!</text>
  </g>`;
    output = output.replace('</svg>', `${emptyStateSvg}\n</svg>`);
  }

  return output;
}

/**
 * Maps data for the 1536x1024 Extended Study Leaderboard template (Ranks 12 to 25).
 */
export function mapExtendedStudyLeaderboardData(
  templateContent: string,
  data: VoiceLeaderboardInput,
  avatarMap: LeaderboardAvatarMap = {}
): string {
  let output = templateContent;

  // 1. Header Replacements
  if (data.title) {
    output = output.replace(
      /<text x="241" y="97"[^>]*>[^<]*<\/text>/,
      `<text x="241" y="97" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="55" font-weight="800" fill="#171b20" text-anchor="start">${escapeXmlText(data.title)}</text>`
    );
  }

  const category = data.category ?? 'CAM HOURS';
  const period = data.period ?? 'Monthly';

  // Subtitle Badge
  output = output.replace(
    new RegExp(`<g id="header-category-badge">[\\s\\S]*?<\\/g>`),
    buildHeaderSubtitleBadge(241, 118, category)
  );

  // Box 1 (Metric)
  output = output.replace(
    new RegExp(`<g id="header-metric-box">[\\s\\S]*?<\\/g>`),
    buildHeaderMetricBox(965, 52, 255, 70, category)
  );

  // Box 2 (Period)
  output = output.replace(
    new RegExp(`<g id="header-period-box">[\\s\\S]*?<\\/g>`),
    buildHeaderPeriodBox(1241, 52, 202, 70, period)
  );

  const entriesByRank = new Map<number, LeaderboardEntry>();
  for (const entry of data.entries) {
    entriesByRank.set(entry.rank, entry);
  }

  const extAvatarSlugs: Record<number, string> = {
    12: 'avatar-riya',
    13: 'avatar-aryan',
    14: 'avatar-meera',
    15: 'avatar-rohit',
    16: 'avatar-siya',
    17: 'avatar-vivaan',
    18: 'avatar-naina',
    19: 'avatar-arjun',
    20: 'avatar-kavya',
    21: 'avatar-manav',
    22: 'avatar-zara',
    23: 'avatar-yash',
    24: 'avatar-aanya',
    25: 'avatar-harsh',
  };

  const rowYMap: Record<number, { pillY: number; avatarCy: number }> = {
    12: { pillY: 242.0, avatarCy: 261.0 },
    13: { pillY: 348.5, avatarCy: 367.5 },
    14: { pillY: 454.5, avatarCy: 473.5 },
    15: { pillY: 560.5, avatarCy: 579.5 },
    16: { pillY: 661.5, avatarCy: 680.5 },
    17: { pillY: 758.0, avatarCy: 777.0 },
    18: { pillY: 855.0, avatarCy: 872.0 },
    19: { pillY: 242.0, avatarCy: 261.0 },
    20: { pillY: 348.5, avatarCy: 367.5 },
    21: { pillY: 454.5, avatarCy: 473.5 },
    22: { pillY: 560.5, avatarCy: 579.5 },
    23: { pillY: 661.5, avatarCy: 680.5 },
    24: { pillY: 758.0, avatarCy: 777.0 },
    25: { pillY: 855.0, avatarCy: 872.0 },
  };

  const extSlotEntryMap = new Map<number, LeaderboardEntry>();

  for (let slotRank = 12; slotRank <= 25; slotRank++) {
    const entryIndex = slotRank - 12;
    const entry = entriesByRank.get(slotRank) ?? data.entries[entryIndex];
    if (entry) {
      extSlotEntryMap.set(slotRank, entry);
    }
  }

  // Handle Column 1 (slots 12 to 18)
  const extCol1Slots = [12, 13, 14, 15, 16, 17, 18].filter((s) => extSlotEntryMap.has(s));
  if (extCol1Slots.length === 0) {
    output = removeSvgElementById(output, 'study-ext-table-col-1');
    for (const s of [12, 13, 14, 15, 16, 17, 18]) {
      output = removeSvgElementById(output, `study-ext-row-${s}`);
    }
    for (const s of [12, 13, 14, 15, 16, 17]) {
      output = removeSvgElementById(output, `study-ext-divider-${s}`);
    }
  } else {
    for (const s of [12, 13, 14, 15, 16, 17, 18]) {
      if (!extSlotEntryMap.has(s)) {
        output = removeSvgElementById(output, `study-ext-row-${s}`);
      }
    }
    for (const s of [12, 13, 14, 15, 16, 17]) {
      if (!extSlotEntryMap.has(s) || !extSlotEntryMap.has(s + 1)) {
        output = removeSvgElementById(output, `study-ext-divider-${s}`);
      }
    }
    const extHeights: Record<number, number> = {
      1: 101,
      2: 207,
      3: 313,
      4: 416,
      5: 515,
      6: 611,
      7: 714,
    };
    const h1 = extHeights[extCol1Slots.length] ?? 714;
    const innerH1 = h1 - 2;
    output = output.replace(
      /(<g id="study-ext-table-col-1">[\s\S]*?<rect [^>]*height=")[^"]*("[^>]*\/>[\s\S]*?<rect [^>]*height=")[^"]*("[^>]*\/>[\s\S]*?<\/g>)/,
      `$1${h1}$2${innerH1}$3`
    );
  }

  // Handle Column 2 (slots 19 to 25)
  const extCol2Slots = [19, 20, 21, 22, 23, 24, 25].filter((s) => extSlotEntryMap.has(s));
  if (extCol2Slots.length === 0) {
    output = removeSvgElementById(output, 'study-ext-table-col-2');
    for (const s of [19, 20, 21, 22, 23, 24, 25]) {
      output = removeSvgElementById(output, `study-ext-row-${s}`);
    }
    for (const s of [19, 20, 21, 22, 23, 24]) {
      output = removeSvgElementById(output, `study-ext-divider-${s}`);
    }
  } else {
    for (const s of [19, 20, 21, 22, 23, 24, 25]) {
      if (!extSlotEntryMap.has(s)) {
        output = removeSvgElementById(output, `study-ext-row-${s}`);
      }
    }
    for (const s of [19, 20, 21, 22, 23, 24]) {
      if (!extSlotEntryMap.has(s) || !extSlotEntryMap.has(s + 1)) {
        output = removeSvgElementById(output, `study-ext-divider-${s}`);
      }
    }
    const extHeights: Record<number, number> = {
      1: 101,
      2: 207,
      3: 313,
      4: 416,
      5: 515,
      6: 611,
      7: 714,
    };
    const h2 = extHeights[extCol2Slots.length] ?? 714;
    const innerH2 = h2 - 2;
    output = output.replace(
      /(<g id="study-ext-table-col-2">[\s\S]*?<rect [^>]*height=")[^"]*("[^>]*\/>[\s\S]*?<rect [^>]*height=")[^"]*("[^>]*\/>[\s\S]*?<\/g>)/,
      `$1${h2}$2${innerH2}$3`
    );
  }

  for (const [slotRank, entry] of extSlotEntryMap.entries()) {

    const rankTheme = getRankTheme(entry.rankId);
    const isHighTier = isHighTierRank(entry.rankId);
    const rankIconUri = rankAssetCache.getRankDataUri(entry.rankId ?? rankTheme.id, 80);
    const rankName = entry.rankName ?? rankTheme.name;
    const hoursFormatted = formatLeaderboardHours(entry.durationMinutes, entry.hours ?? entry.camHours);

    const isCol1 = slotRank <= 18;
    const userStartX = isCol1 ? 327 : 985;
    const hoursEndX = isCol1 ? 729 : 1390;
    const defaultPillX = isCol1 ? 501.5 : 1152.5;

    // Dynamic collision-free sizing for rank pill & username with strictly equal horizontal padding
    const iconSize = isHighTier ? 36 : 33;
    const tw = getRankTextWidth(rankName, 16);
    const pad = 12;
    const gap = 8;
    const pillW = pad + iconSize + gap + tw + 14;

    const hoursW = estimateTextWidth(hoursFormatted, 25);
    const hoursLeft = hoursEndX - hoursW;
    const maxPillRight = hoursLeft - 14;

    const pillX = (defaultPillX + pillW > maxPillRight) ? maxPillRight - pillW : defaultPillX;
    const maxNameW = Math.max(80, (pillX - 12) - userStartX);
    const fitting = fitUsername(entry.username, maxNameW, [24, 21, 18, 16]);
    const escapedName = escapeXmlText(fitting.displayName);
    const escapedHours = escapeXmlText(hoursFormatted);

    const conf = rowYMap[slotRank]!;
    const pillY = conf.pillY - 2;

    const isRequester = Boolean(entry.isCurrentUser);

    // 2a. Rank Number Text
    const rankWeight = isRequester ? '900' : '500';
    const rankNumColor = isRequester ? REQUESTER_HIGHLIGHT_THEME.rankNumColor : '#11191f';
    output = output.replace(
      new RegExp(`(id="study-ext-rank-num-${slotRank}"[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*("[^>]*>)[^<]*(<)`),
      `$1${rankWeight}$2${rankNumColor}$3${entry.rank}$4`
    );

    // 2b. Username Text
    const nameWeight = isRequester ? '900' : '500';
    const nameColor = isRequester ? REQUESTER_HIGHLIGHT_THEME.nameColor : '#10161b';
    output = output.replace(
      new RegExp(`(id="study-ext-user-${slotRank}"[^>]*font-size=")[^"]*("[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*("[^>]*>)[^<]*(<)`),
      `$1${fitting.fontSize}$2${nameWeight}$3${nameColor}$4${escapedName}$5`
    );

    // 2c. Hours Text
    const hoursWeight = isRequester ? '900' : '700';
    const hoursColor = isRequester ? rankTheme.darkerColor : rankTheme.primaryColor;
    output = output.replace(
      new RegExp(`(id="study-ext-hours-${slotRank}"[^>]*font-weight=")[^"]*("[^>]*fill=")[^"]*("[^>]*>)[^<]*(<)`),
      `$1${hoursWeight}$2${hoursColor}$3${escapedHours}$4`
    );

    // 2d. Rank Pill
    const iconX = pillX + pad;
    const iconY = pillY + (42 - iconSize) / 2;
    const textX = iconX + iconSize + gap;

    const rankPillSvg = `<g id="study-ext-rank-pill-${slotRank}">
      <rect x="${pillX}" y="${pillY}" width="${pillW}" height="42" rx="21" fill="${rankTheme.pillBg}" stroke="${rankTheme.pillBorder}" stroke-width="1" />
      ${rankIconUri ? `<image href="${rankIconUri}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet" />` : ''}
      <text x="${textX}" y="${pillY + 27}" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="16" font-weight="500" fill="${rankTheme.pillTextColor}" text-anchor="start">${escapeXmlText(rankName)}</text>
    </g>`;

    output = output.replace(
      new RegExp(`<g id="study-ext-rank-pill-${slotRank}">[\\s\\S]*?<\\/g>`),
      rankPillSvg
    );

    // 2e. Custom Avatar
    const avatarUri = avatarMap[entry.rank];
    const avatarSlug = extAvatarSlugs[slotRank]!;
    if (avatarUri) {
      const avatarCx = isCol1 ? 265 : 919;
      const avatarCy = conf.avatarCy;
      const avatarSvg = `<g id="${avatarSlug}">
        <clipPath id="study-ext-clip-${slotRank}"><circle cx="${avatarCx}" cy="${avatarCy}" r="38" /></clipPath>
        <image href="${avatarUri}" x="${avatarCx - 38}" y="${avatarCy - 38}" width="76" height="76" clip-path="url(#study-ext-clip-${slotRank})" preserveAspectRatio="xMidYMid slice" />
        <circle cx="${avatarCx}" cy="${avatarCy}" r="38" fill="none" stroke="#ffffff" stroke-width="2" />
        <circle cx="${avatarCx}" cy="${avatarCy}" r="38" fill="none" stroke="#e4d9cf" stroke-width="0.8" />
      </g>`;

      output = output.replace(
        new RegExp(`<g id="${avatarSlug}">[\\s\\S]*?<\\/g>\\s*<circle[^>]*\\/>\\s*<circle[^>]*\\/>\\s*<\\/g>`),
        avatarSvg
      );
    }

    // 2f. Current User Highlight
    if (isRequester) {
      output = output.replace(
        new RegExp(`<rect id="study-ext-rank-box-${slotRank}" (x="[^"]*" y="[^"]*" width="54" height="56" rx="12" fill=")[^"]*(" stroke=")[^"]*(" stroke-width=")[^"]*(")`),
        `<rect id="study-ext-rank-box-${slotRank}" $1${REQUESTER_HIGHLIGHT_THEME.rankBoxBg}$2${REQUESTER_HIGHLIGHT_THEME.rankBoxBorder}$3${REQUESTER_HIGHLIGHT_THEME.rankBoxStrokeWidth}$4`
      );
    }
  }

  if (data.entries.length === 0) {
    const emptyStateSvg = `  <g id="study-ext-empty-state">
    <rect x="448" y="380" width="640" height="260" rx="24" fill="#ffffff" stroke="#eadfd7" stroke-width="1.5" />
    <circle cx="768" cy="455" r="36" fill="#fff7ed" stroke="#fed7aa" stroke-width="1.5" />
    <path d="M756 450 C748 450 746 458 758 462 M780 450 C788 450 790 458 778 462" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M764 470 L764 475 L758 480 L778 480 L772 475 L772 470 Z" fill="#fdba74" stroke="#ea580c" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M755 446 L781 446 L779 462 Q777 470 768 470 Q759 470 757 462 Z" fill="#fb923c" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <text x="768" y="530" font-family="Plus Jakarta Sans, Nunito, Arial, sans-serif" font-size="28" font-weight="800" fill="#2d2118" text-anchor="middle">No Users on this Page</text>
    <text x="768" y="568" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="20" font-weight="600" fill="#7d6a5e" text-anchor="middle">There are no participants in this ranking range.</text>
    <text x="768" y="598" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="17" font-weight="500" fill="#a8988e" text-anchor="middle">Check earlier pages or invite friends to join!</text>
  </g>`;
    output = output.replace('</svg>', `${emptyStateSvg}\n</svg>`);
  }

  return output;
}

/**
 * Universal voice leaderboard data mapper supporting classic (1200x835),
 * study podium (1536x1024, ranks 1-11), and study extended (1536x1024, ranks 12-25) layouts.
 */
export function mapVoiceLeaderboardData(
  templateContent: string,
  data: VoiceLeaderboardInput,
  avatarMap: LeaderboardAvatarMap = {}
): string {
  const isExtended =
    templateContent.includes('study-ext-') ||
    templateContent.includes('Ranks 12 to 25') ||
    templateContent.includes('clip-riya');

  if (isExtended) {
    return mapExtendedStudyLeaderboardData(templateContent, data, avatarMap);
  }

  const isStudy =
    templateContent.includes('1536') ||
    templateContent.includes('Study Leaderboard') ||
    templateContent.includes('study-row-4');

  if (isStudy) {
    return mapStudyLeaderboardData(templateContent, data, avatarMap);
  }

  // Classic 1200x835 Leaderboard Mapping
  let output = templateContent;

  // Header replacements
  output = output.replace('{{TITLE}}', escapeXmlText(data.title));
  output = output.replace('{{SUBTITLE}}', escapeXmlText(data.subtitle));
  output = output.replace('{{PERIOD}}', escapeXmlText(data.period));

  const entriesByRank = new Map<number, LeaderboardEntry>();
  for (const entry of data.entries) {
    entriesByRank.set(entry.rank, entry);
  }

  // 1. Podium replacements (Ranks 1, 2, 3)
  for (let rank = 1; rank <= 3; rank++) {
    const entry = entriesByRank.get(rank);
    if (!entry) continue;

    const escapedName = escapeXmlText(entry.username);
    const escapedHours = escapeXmlText(formatLeaderboardHours(entry.durationMinutes, entry.hours ?? entry.camHours));
    const badgeText = escapeXmlText(entry.badge ?? (rank === 1 ? 'Champion' : rank === 2 ? 'Silver' : 'Bronze'));

    output = output.replace(
      new RegExp(`id="podium-user-${rank}">[^<]*<`),
      `id="podium-user-${rank}">${escapedName}<`
    );
    output = output.replace(
      new RegExp(`id="podium-hours-${rank}">[^<]*<`),
      `id="podium-hours-${rank}">${escapedHours}<`
    );
    output = output.replace(
      new RegExp(`id="podium-badge-${rank}">[^<]*<`),
      `id="podium-badge-${rank}">${badgeText}<`
    );

    const avatarDataUri = avatarMap[rank];
    if (avatarDataUri) {
      const radius = rank === 1 ? 42 : 36;
      const cy = rank === 1 ? 95 : 90;
      const avatarGroup = `<g id="podium-avatar-${rank}">
        <clipPath id="podium-clip-${rank}"><circle cx="170" cy="${cy}" r="${radius}" /></clipPath>
        <image href="${avatarDataUri}" x="${170 - radius}" y="${cy - radius}" width="${radius * 2}" height="${radius * 2}" clip-path="url(#podium-clip-${rank})" preserveAspectRatio="xMidYMid slice" />
      </g>`;

      const regex = new RegExp(`<g id="podium-avatar-${rank}">[\\s\\S]*?<\\/g>`);
      output = output.replace(regex, avatarGroup);
    }
  }

  // 2. Table rows (Ranks 4-10)
  let rowsMarkup = '';
  const remainingEntries = data.entries.filter((e) => e.rank >= 4 && e.rank <= 10);

  remainingEntries.forEach((entry, idx) => {
    const isCol1 = idx < 4;
    const colX = isCol1 ? 30 : 560;
    const rowIdx = isCol1 ? idx : idx - 4;
    const rowY = 62 + rowIdx * 68;
    const rowWidth = 490;
    const rowHeight = 56;

    const escapedName = escapeXmlText(entry.username);
    const escapedHours = escapeXmlText(formatLeaderboardHours(entry.durationMinutes, entry.hours ?? entry.camHours));
    const avatarUri = avatarMap[entry.rank];
    const isCurrentUser = Boolean(entry.isCurrentUser);
    const bgFill = isCurrentUser ? REQUESTER_HIGHLIGHT_THEME.rankBoxBg : '#FFFFFF';
    const borderStroke = isCurrentUser ? REQUESTER_HIGHLIGHT_THEME.rankBoxBorder : '#E2E8F0';
    const rankCircleFill = isCurrentUser ? '#FED7AA' : '#EDF2F7';
    const rankNumFill = isCurrentUser ? REQUESTER_HIGHLIGHT_THEME.rankNumColor : '#4A5568';
    const numWeight = isCurrentUser ? '900' : '700';
    const nameWeight = isCurrentUser ? '900' : '700';
    const nameColor = isCurrentUser ? REQUESTER_HIGHLIGHT_THEME.nameColor : '#0B1528';
    const hoursWeight = isCurrentUser ? '900' : '700';
    const hoursFill = isCurrentUser ? '#C93B2E' : '#1A5096';

    let avatarTag = '';
    if (avatarUri) {
      avatarTag = `<clipPath id="row-clip-${entry.rank}"><circle cx="${colX + 58}" cy="${rowY + 28}" r="18" /></clipPath>
      <image href="${avatarUri}" x="${colX + 40}" y="${rowY + 10}" width="36" height="36" clip-path="url(#row-clip-${entry.rank})" preserveAspectRatio="xMidYMid slice" />`;
    } else {
      const initial = escapedName.charAt(0).toUpperCase();
      avatarTag = `<circle cx="${colX + 58}" cy="${rowY + 28}" r="18" fill="#E9ECEF" />
      <text x="${colX + 58}" y="${rowY + 34}" font-size="14" font-weight="700" fill="#495057" text-anchor="middle">${initial}</text>`;
    }

    const badgeTag = entry.badge
      ? `<rect x="${colX + 230}" y="${rowY + 18}" width="70" height="20" rx="10" fill="#F1F3F5" />
      <text x="${colX + 265}" y="${rowY + 32}" font-size="10.5" font-weight="600" fill="#495057" text-anchor="middle">${escapeXmlText(entry.badge)}</text>`
      : '';

    rowsMarkup += `
      <!-- Rank ${entry.rank} Row -->
      <g>
        <rect x="${colX}" y="${rowY}" width="${rowWidth}" height="${rowHeight}" rx="14" fill="${bgFill}" stroke="${borderStroke}" stroke-width="${isCurrentUser ? 2 : 1}" />
        <!-- Rank Badge -->
        <circle cx="${colX + 22}" cy="${rowY + 28}" r="14" fill="${rankCircleFill}" />
        <text x="${colX + 22}" y="${rowY + 33}" font-size="12" font-weight="${numWeight}" fill="${rankNumFill}" text-anchor="middle">#${entry.rank}</text>
        ${avatarTag}
        <!-- Username -->
        <text x="${colX + 86}" y="${rowY + 34}" font-size="16" font-weight="${nameWeight}" fill="${nameColor}">${escapedName}</text>
        ${badgeTag}
        <!-- Hours -->
        <text x="${colX + rowWidth - 20}" y="${rowY + 34}" font-size="15" font-weight="${hoursWeight}" fill="${hoursFill}" text-anchor="end">${escapedHours}</text>
      </g>`;
  });

  output = output.replace('<!-- ROWS_PLACEHOLDER -->', rowsMarkup);
  return output;
}
