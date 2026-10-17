import { escapeXmlText } from '../../core/svg/svg-escaping.js';
import { voiceProfileConfig } from './config.js';
import type { VoiceProfileInput } from './schema.js';

export function mapVoiceProfileData(svgTemplate: string, data: VoiceProfileInput, avatarDataUri?: string): string {
  let output = svgTemplate;
  const defaults = voiceProfileConfig.defaults;

  // 1. Inject Avatar
  if (avatarDataUri) {
    const avatarGroupRegex = /<!-- Stylized Vector Portrait inside Avatar Clip -->[\s\S]*?(?=<!-- Inner Avatar Border Ring -->)/;
    const { x, y, width, height } = voiceProfileConfig.avatar;
    const avatarMarkup = `<!-- Custom User Avatar inside Avatar Clip -->
    <g clip-path="url(#avatar-clip)">
      <image href="${avatarDataUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />
    </g>

    `;
    output = output.replace(avatarGroupRegex, avatarMarkup);
  }

  // 2. Username
  if (data.username) {
    const escapedUsername = escapeXmlText(data.username);
    output = output.replace(
      /<text x="252" y="139" font-size="44" class="title-dark" letter-spacing="-0.02em">[^<]*<\/text>/,
      `<text x="252" y="139" font-size="44" class="title-dark" letter-spacing="-0.02em">${escapedUsername}</text>`
    );
  }

  // 3. Bio
  if (data.bio !== undefined) {
    const escapedBio = escapeXmlText(data.bio);
    output = output.replace(
      /<text x="253" y="181" font-size="20" font-weight="500" fill="#1A5096">[^<]*<\/text>/,
      `<text x="253" y="181" font-size="20" font-weight="500" fill="#1A5096">${escapedBio}</text>`
    );
  }

  // 4. Counters (Achievements, Goals, Milestones)
  const achievements = data.achievements ?? defaults.achievements;
  output = output.replace(
    /(<!-- 1\. Achievements -->[\s\S]*?<text x="89" y="50" font-size="28" class="stat-num">)[^<]*(<\/text>)/,
    `$1${achievements}$2`
  );

  const goals = data.goals ?? defaults.goals;
  output = output.replace(
    /(<!-- 2\. Goals -->[\s\S]*?<text x="283" y="50" font-size="28" class="stat-num">)[^<]*(<\/text>)/,
    `$1${goals}$2`
  );

  const milestones = data.milestones ?? defaults.milestones;
  output = output.replace(
    /(<!-- 3\. Milestones -->[\s\S]*?<text x="428" y="50" font-size="28" class="stat-num">)[^<]*(<\/text>)/,
    `$1${milestones}$2`
  );

  // 5. Leaderboard
  const rank = data.leaderboard?.rank ?? defaults.leaderboardRank;
  output = output.replace(
    /<text x="49" y="114" font-size="52" font-weight="800" fill="#7B2CBF">[^<]*<\/text>/,
    `<text x="49" y="114" font-size="52" font-weight="800" fill="#7B2CBF">${escapeXmlText(rank)}</text>`
  );

  const percentile = data.leaderboard?.percentile ?? defaults.leaderboardPercentile;
  output = output.replace(
    /<text x="49" y="148" font-size="17" font-weight="600" fill="#1A5096">[^<]*<\/text>/,
    `<text x="49" y="148" font-size="17" font-weight="600" fill="#1A5096">${escapeXmlText(percentile)}</text>`
  );

  // 6. Hours Overview
  const hours = data.hoursOverview;
  if (hours?.monthlyLabel) {
    output = output.replace(
      /<text x="34" y="16" class="sub-header">[^<]*<\/text>/,
      `<text x="34" y="16" class="sub-header">${escapeXmlText(hours.monthlyLabel)}</text>`
    );
  }

  const monthlyVal = hours?.monthly ?? defaults.monthlyHours;
  output = output.replace(
    /(<!-- Column 1: MAY \(MONTHLY\) -->[\s\S]*?<text x="0" y="68" font-size="36" class="stat-num">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(monthlyVal)}$2`
  );

  const weeklyVal = hours?.weekly ?? defaults.weeklyHours;
  output = output.replace(
    /(<!-- Column 2: WEEKLY -->[\s\S]*?<text x="0" y="68" font-size="36" class="stat-num">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(weeklyVal)}$2`
  );

  const dailyVal = hours?.daily ?? defaults.dailyHours;
  output = output.replace(
    /(<!-- Column 3: DAILY -->[\s\S]*?<text x="0" y="68" font-size="36" class="stat-num">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(dailyVal)}$2`
  );

  const allTimeVal = hours?.allTime ?? defaults.allTimeHours;
  output = output.replace(
    /(<!-- Column 4: ALL TIME -->[\s\S]*?<text x="0" y="68" font-size="36" class="stat-num">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(allTimeVal)}$2`
  );

  // 7. Next Rank Progression
  const rankProg = data.nextRank;
  if (rankProg?.currentRank || rankProg?.currentRange) {
    const curName = rankProg.currentRank ?? defaults.currentRankName;
    const curRange = rankProg.currentRange ?? defaults.currentRankRange;
    output = output.replace(
      /<!-- Diamond Text -->\s*<text x="48" y="68" font-size="15" font-weight="600" fill="#0E1726">[\s\S]*?<\/text>/,
      `<!-- Diamond Text -->\n        <text x="48" y="68" font-size="15" font-weight="600" fill="#0E1726">\n          ${escapeXmlText(curName)} <tspan fill="#1A5096" font-weight="500">${escapeXmlText(curRange)}</tspan>\n        </text>`
    );
  }

  if (rankProg?.nextRank || rankProg?.nextRange) {
    const nextName = rankProg.nextRank ?? defaults.nextRankName;
    const nextRange = rankProg.nextRange ?? defaults.nextRankRange;
    output = output.replace(
      /<!-- Ascendant Text -->\s*<text x="307" y="68" font-size="15" font-weight="600" fill="#0E1726">[\s\S]*?<\/text>/,
      `<!-- Ascendant Text -->\n        <text x="307" y="68" font-size="15" font-weight="600" fill="#0E1726">\n          ${escapeXmlText(nextName)} <tspan fill="#1A5096" font-weight="500">${escapeXmlText(nextRange)}</tspan>\n        </text>`
    );
  }

  const progressPercent = rankProg?.progressPercent ?? defaults.rankProgressPercent;
  const barWidth = Math.min(248, Math.max(0, Math.round((progressPercent / 100) * 248)));
  output = output.replace(
    /<rect x="526" y="57" width="\d+" height="8" rx="4" fill="url\(#progress-grad\)" \/>/,
    `<rect x="526" y="57" width="${barWidth}" height="8" rx="4" fill="url(#progress-grad)" />`
  );
  output = output.replace(
    /<!-- 71% Text -->\s*<text x="796" y="68" font-size="17" font-weight="600" fill="#1A5096">[^<]*<\/text>/,
    `<!-- 71% Text -->\n        <text x="796" y="68" font-size="17" font-weight="600" fill="#1A5096">${progressPercent}%</text>`
  );

  // 8. Time Breakdown
  const timeBreakdown = data.timeBreakdown;
  const camHours = timeBreakdown?.camHours ?? defaults.camHours;
  const camPercent = timeBreakdown?.camPercent ?? defaults.camPercent;
  output = output.replace(
    /(<!-- Card 1: CAM HOURS -->[\s\S]*?<text x="24" y="76" font-size="31" class="stat-num">)[^<]*(<\/text>\s*<text x="185" y="76" font-size="17" font-weight="700" fill="#22C522">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(camHours)}$2${escapeXmlText(camPercent)}$3`
  );

  const nonCamHours = timeBreakdown?.nonCamHours ?? defaults.nonCamHours;
  const nonCamPercent = timeBreakdown?.nonCamPercent ?? defaults.nonCamPercent;
  output = output.replace(
    /(<!-- Card 2: NON CAM HOURS -->[\s\S]*?<text x="24" y="76" font-size="31" class="stat-num">)[^<]*(<\/text>\s*<text x="206" y="76" font-size="17" font-weight="700" fill="#FF2E1F">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(nonCamHours)}$2${escapeXmlText(nonCamPercent)}$3`
  );

  const overallHours = timeBreakdown?.overallHours ?? defaults.overallHours;
  output = output.replace(
    /(<!-- Card 3: OVERALL HOURS -->[\s\S]*?<text x="24" y="76" font-size="31" font-weight="700" fill="#0066FF" letter-spacing="-0.02em">)[^<]*(<\/text>)/,
    `$1${escapeXmlText(overallHours)}$2`
  );

  // 9. Last 7 Days Bars
  if (data.last7Days && data.last7Days.length === 7) {
    const xPositions = [
      { textX: 41.5, barX: 29 },
      { textX: 111.5, barX: 99 },
      { textX: 181.5, barX: 169 },
      { textX: 250.5, barX: 238 },
      { textX: 321.5, barX: 309 },
      { textX: 390.5, barX: 378 },
      { textX: 460.5, barX: 448 },
    ];

    // Find max minutes or default to 600m (10h)
    const maxMinutes = Math.max(
      ...data.last7Days.map((d) => d.minutes ?? 60),
      600
    );

    let barsMarkup = '';
    data.last7Days.forEach((d, idx) => {
      const pos = xPositions[idx]!;
      const minutes = d.minutes ?? 60;
      const height = Math.min(80, Math.max(10, Math.round((minutes / maxMinutes) * 80)));
      const y = 130 - height; // baseline at y=130
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
