import { escapeXmlText } from '../../core/svg/svg-escaping.js';
import type { VoiceLeaderboardInput, LeaderboardEntry } from './schema.js';

export interface LeaderboardAvatarMap {
  [rank: number]: string; // rank -> base64 dataUri
}

export function mapVoiceLeaderboardData(
  templateContent: string,
  data: VoiceLeaderboardInput,
  avatarMap: LeaderboardAvatarMap = {}
): string {
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
    const escapedHours = escapeXmlText(entry.hours);
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
  // Split ranks 4..10 into 2 columns:
  // Col 1: Ranks 4, 5, 6, 7 (y starts at 60, step 65)
  // Col 2: Ranks 8, 9, 10
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
    const escapedHours = escapeXmlText(entry.hours);
    const avatarUri = avatarMap[entry.rank];
    const isCurrentUser = entry.isCurrentUser;
    const bgFill = isCurrentUser ? '#F3EEFF' : '#FFFFFF';
    const borderStroke = isCurrentUser ? '#7B2CBF' : '#E2E8F0';

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
        <rect x="${colX}" y="${rowY}" width="${rowWidth}" height="${rowHeight}" rx="14" fill="${bgFill}" stroke="${borderStroke}" stroke-width="${isCurrentUser ? 1.5 : 1}" />
        <!-- Rank Badge -->
        <circle cx="${colX + 22}" cy="${rowY + 28}" r="14" fill="#EDF2F7" />
        <text x="${colX + 22}" y="${rowY + 33}" font-size="12" font-weight="700" fill="#4A5568" text-anchor="middle">#${entry.rank}</text>
        ${avatarTag}
        <!-- Username -->
        <text x="${colX + 86}" y="${rowY + 34}" font-size="16" font-weight="700" fill="#0B1528">${escapedName}</text>
        ${badgeTag}
        <!-- Hours -->
        <text x="${colX + rowWidth - 20}" y="${rowY + 34}" font-size="15" font-weight="700" fill="#1A5096" text-anchor="end">${escapedHours}</text>
      </g>`;
  });

  output = output.replace('<!-- ROWS_PLACEHOLDER -->', rowsMarkup);
  return output;
}
