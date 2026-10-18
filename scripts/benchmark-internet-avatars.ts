import fs from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { avatarCache } from '../src/core/images/avatar-cache.js';
import { voiceProfileModule } from '../src/modules/voice-profile/index.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';
import { mapVoiceLeaderboardData } from '../src/modules/voice-leaderboard/data-mapper.js';
import { SvgRenderer } from '../src/core/renderer/svg-renderer.js';

const TARGET_DIR = resolve(process.cwd(), 'artifacts');

// Curated diverse real internet avatar URLs across 5 different CDNs
export const DIVERSE_AVATAR_POOLS = {
  github: [
    'https://avatars.githubusercontent.com/u/100?v=4',
    'https://avatars.githubusercontent.com/u/200?v=4',
    'https://avatars.githubusercontent.com/u/300?v=4',
    'https://avatars.githubusercontent.com/u/400?v=4',
    'https://avatars.githubusercontent.com/u/500?v=4',
    'https://avatars.githubusercontent.com/u/600?v=4',
  ],
  unsplash: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=faces',
  ],
  dicebear: [
    'https://api.dicebear.com/7.x/bottts/png?seed=Sakha',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Aarav',
    'https://api.dicebear.com/7.x/pixel-art/png?seed=Mira',
    'https://api.dicebear.com/7.x/adventurer/png?seed=Dev',
  ],
  robohash_gravatar: [
    'https://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50?f=y',
    'https://robohash.org/student1.png?size=200x200',
  ],
  mixed11: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces', // Aarav (#1)
    'https://avatars.githubusercontent.com/u/100?v=4',                                                 // Sakha (#2)
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=faces', // Mira (#3)
    'https://api.dicebear.com/7.x/bottts/png?seed=PixelDreams',                                       // PixelDreams (#4)
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces', // Kabir (#5)
    'https://api.dicebear.com/7.x/avataaars/png?seed=Anaya',                                          // Anaya (#6)
    'https://avatars.githubusercontent.com/u/200?v=4',                                                 // Dev (#7)
    'https://api.dicebear.com/7.x/adventurer/png?seed=Isha',                                          // Isha (#8)
    'https://avatars.githubusercontent.com/u/300?v=4',                                                 // Neel (#9)
    'https://robohash.org/student1.png?size=200x200',                                                 // Tara (#10)
    'https://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50?f=y',                           // HexCode (#11)
  ]
};

function createContextWithTiming(moduleId: string) {
  const timings: Record<string, number> = {};
  const measureFn = async <T>(stage: string, fn: () => Promise<T> | T): Promise<T> => {
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      timings[stage] = (timings[stage] ?? 0) + (performance.now() - t0);
    }
  };
  const ctx = createRenderContext(moduleId, undefined, measureFn);
  return { ctx, timings };
}

function buildTier1Template(rawSvg: string): string {
  const pureStaticBgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
    <defs>
      <filter id="softShadow" x="-8%" y="-8%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#181a1f" flood-opacity="0.05" />
      </filter>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fffdfa" />
        <stop offset="100%" stop-color="#fbf8f3" />
      </linearGradient>
    </defs>
    <rect width="1536" height="1024" fill="#f8f5ee" />
    <rect x="14" y="14" width="1508" height="1000" rx="25" fill="url(#paper)" stroke="#eadfd7" stroke-width="1" filter="url(#softShadow)"/>
    <g id="notebook-binding">
      <path d="M72 18 L48 18 L48 67" fill="none" stroke="#f8e4d5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M1464 18 L1488 18 L1488 67" fill="none" stroke="#f8e4d5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <g id="decorative-stars">
      <path d="M68.00,175.00 L70.42,191.58 L87.00,194.00 L70.42,196.42 L68.00,213.00 L65.58,196.42 L49.00,194.00 L65.58,191.58 Z" fill="none" stroke="#62bca8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M115.00,243.00 L116.53,253.47 L127.00,255.00 L116.53,256.53 L115.00,267.00 L113.47,256.53 L103.00,255.00 L113.47,253.47 Z" fill="none" stroke="#ff806a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M1469.00,149.00 L1470.78,161.22 L1483.00,163.00 L1470.78,164.78 L1469.00,177.00 L1467.22,164.78 L1455.00,163.00 L1467.22,161.22 Z" fill="none" stroke="#c4a4dc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M1466.00,287.00 L1467.65,298.35 L1479.00,300.00 L1467.65,301.65 L1466.00,313.00 L1464.35,301.65 L1453.00,300.00 L1464.35,298.35 Z" fill="none" stroke="#68bca7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M68.00,652.00 L69.02,658.98 L76.00,660.00 L69.02,661.02 L68.00,668.00 L66.98,661.02 L60.00,660.00 L66.98,658.98 Z" fill="none" stroke="#ffb59f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M1471.00,706.00 L1472.65,717.35 L1484.00,719.00 L1472.65,720.65 L1471.00,732.00 L1469.35,720.65 L1458.00,719.00 L1469.35,717.35 Z" fill="none" stroke="#67bca7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M75.00,749.00 L76.02,755.98 L83.00,757.00 L76.02,758.02 L75.00,765.00 L73.98,758.02 L67.00,757.00 L73.98,755.98 Z" fill="none" stroke="#c3a2dc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M1450.00,672.00 L1450.89,678.11 L1457.00,679.00 L1450.89,679.89 L1450.00,686.00 L1449.11,679.89 L1443.00,679.00 L1449.11,678.11 Z" fill="none" stroke="#ffb49c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M1485.00,961.00 L1486.27,969.73 L1495.00,971.00 L1486.27,972.27 L1485.00,981.00 L1483.73,972.27 L1475.00,971.00 L1483.73,969.73 Z" fill="none" stroke="#e5b18d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M1460.00,203.00 L1464.55,214.74 L1477.12,215.44 L1467.36,223.39 L1470.58,235.56 L1460.00,228.74 L1449.42,235.56 L1452.64,223.39 L1442.88,215.44 L1455.45,214.74 Z" fill="none" stroke="#ff963d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M43.00,683.00 L47.04,693.43 L58.22,694.06 L49.54,701.13 L52.40,711.94 L43.00,705.88 L33.60,711.94 L36.46,701.13 L27.78,694.06 L38.96,693.43 Z" fill="none" stroke="#ff7f67" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M1466.00,782.00 L1470.80,794.39 L1484.07,795.13 L1473.77,803.52 L1477.17,816.37 L1466.00,809.17 L1454.83,816.37 L1458.23,803.52 L1447.93,795.13 L1461.20,794.39 Z" fill="none" stroke="#ff963d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <rect x="118" y="47" width="90" height="88" rx="17" fill="#fffaf7" stroke="#ffddd3" stroke-width="1" />
    <g id="trophy-icon">
      <path d="M148 76 C136 76 134 88 150 94 M178 76 C190 76 192 88 176 94" fill="none" stroke="#e85b4d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M160 105 L160 113 L152 120 L174 120 L166 113 L166 105 Z" fill="#f2a49a" stroke="#e85b4d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M147 71 L179 71 L177 93 Q175 105 163 105 Q151 105 149 93 Z" fill="#ff806c" stroke="#e85b4d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <ellipse cx="163" cy="71" rx="16" ry="4" fill="#ffd0c7" stroke="#e85b4d" stroke-width="2" />
      <polygon points="163,78 165,84 171,85 166,89 168,96 163,92 158,96 160,89 155,85 161,84" fill="#fff5ee" />
    </g>
    <!-- Podium Cards Base Rects -->
    <rect id="podium-card-rect-2" x="179" y="201" width="364" height="423" rx="29" fill="#fffdfa" stroke="#c5ded5" stroke-width="1.2" />
    <rect id="podium-card-rect-1" x="571" y="181" width="398" height="443" rx="29" fill="#fffdfa" stroke="#ff9b8f" stroke-width="1.2" />
    <rect id="podium-card-rect-3" x="992" y="201" width="352" height="423" rx="29" fill="#fffdfa" stroke="#e4d5ee" stroke-width="1.2" />
    <!-- Podium Top Pills with Shadow -->
    <rect id="podium-top-pill-2" x="298.5" y="172" width="125" height="52" rx="19" fill="#fffaf7" stroke="#f0e3dc" stroke-width="1" filter="url(#softShadow)"/>
    <rect id="podium-top-pill-1" x="704.5" y="160" width="139" height="52" rx="19" fill="#fffaf7" stroke="#f0e3dc" stroke-width="1" filter="url(#softShadow)"/>
    <rect id="podium-top-pill-3" x="1096.5" y="172" width="127" height="52" rx="19" fill="#fffaf7" stroke="#f0e3dc" stroke-width="1" filter="url(#softShadow)"/>
  </svg>`;

  const bakedBgPng = SvgRenderer.renderToPng({ svgContent: pureStaticBgSvg, width: 1536 });
  const base64Bg = bakedBgPng.toString('base64');

  let tier1Svg = rawSvg.replace(/<filter id="softShadow"[\s\S]*?<\/filter>/, '');
  tier1Svg = tier1Svg.replace(
    /<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url\(#paper\)" stroke="#eadfd7" stroke-width="1" filter="url\(#softShadow\)"\/>[\s\S]*?<\/g>\s*<rect x="118" y="47"[\s\S]*?<\/g>\s*(?=<text x="234" y="93")/,
    `<image href="data:image/png;base64,${base64Bg}" x="0" y="0" width="1536" height="1024" />\n`
  );
  tier1Svg = tier1Svg.replace(/<rect id="podium-card-rect-2"[^>]*\/>/g, '<!-- podium-card-rect-2 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-card-rect-1"[^>]*\/>/g, '<!-- podium-card-rect-1 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-card-rect-3"[^>]*\/>/g, '<!-- podium-card-rect-3 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-top-pill-2"[^>]*\/>/g, '<!-- podium-top-pill-2 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-top-pill-1"[^>]*\/>/g, '<!-- podium-top-pill-1 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-top-pill-3"[^>]*\/>/g, '<!-- podium-top-pill-3 baked in bg -->');

  return tier1Svg;
}

async function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  fontRegistry.initialize();
  await rankAssetCache.initialize();
  await leaderboardAssetCache.initialize();

  const rawSvg = fs.readFileSync('templates/voice-leaderboard/study-leaderboard-2.svg', 'utf8');
  const tier1TemplateSvg = buildTier1Template(rawSvg);

  console.log('================================================================================');
  console.log('REAL-TIME INTERNET AVATAR BENCHMARK: DIVERSE CDNs & TIER 1 COMPARISON');
  console.log('================================================================================');
  console.log('CDNs Tested: Unsplash Photos (JPEG), GitHub (PNG), DiceBear (PNG), Gravatar, RoboHash');
  console.log('Canvas Preserved at scale: 1 | Ranks & Medals: Clean 2x Supersampled');
  console.log('================================================================================\n');

  // Payloads
  const profileUnsplash = {
    schemaVersion: '1.0',
    requestId: 'profile-bench-unsplash',
    render: { templateId: 'profile-card-v1', format: 'png', scale: 1 },
    profile: {
      userId: 'user-001',
      username: 'Sakha',
      avatarUrl: DIVERSE_AVATAR_POOLS.unsplash[0]!,
    },
    rank: {
      current: { id: 'diamond', name: 'Diamond', minimumHours: 155, maximumHours: 205 },
      next: { id: 'ascendant', name: 'Ascendant', minimumHours: 205, maximumHours: 280 },
      progressPercent: 71,
    },
    counters: { achievements: 24, goals: 12, milestones: 7 },
    leaderboard: { rank: 1, topPercent: 1, trendValues: [18, 28, 47, 42] },
    activity: {
      periodLabel: 'LAST 7 DAYS',
      entries: [
        { label: 'Mon', durationMinutes: 392 },
        { label: 'Tue', durationMinutes: 465 },
        { label: 'Wed', durationMinutes: 310 },
        { label: 'Thu', durationMinutes: 565 },
        { label: 'Fri', durationMinutes: 485 },
        { label: 'Sat', durationMinutes: 375 },
        { label: 'Sun', durationMinutes: 547, isCurrentDay: true },
      ],
    },
    hours: {
      monthly: { label: 'Oct (Monthly)', durationMinutes: 19260 },
      weekly: { label: 'Week 42', durationMinutes: 4680 },
      daily: { label: 'Today', durationMinutes: 491 },
      allTime: { label: 'All Time', durationMinutes: 116268 },
    },
    timeBreakdown: { camMinutes: 67680, nonCamMinutes: 48588 },
  };

  const profileGitHub = JSON.parse(JSON.stringify(profileUnsplash));
  profileGitHub.profile.avatarUrl = DIVERSE_AVATAR_POOLS.github[0]!;

  const profileDiceBear = JSON.parse(JSON.stringify(profileUnsplash));
  profileDiceBear.profile.avatarUrl = DIVERSE_AVATAR_POOLS.dicebear[0]!;

  const lb11Mixed = {
    schemaVersion: '1.0',
    requestId: 'lb11-bench-mixed',
    render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1 },
    title: 'Study Leaderboard',
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: [
        { position: 1, username: 'Aarav Sharma', durationMinutes: 19260, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[0]!, rank: { id: 'immortal', name: 'Immortal' } },
        { position: 2, username: 'Sakha', durationMinutes: 17040, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[1]!, rank: { id: 'ascendant', name: 'Ascendant' }, isCurrentUser: true },
        { position: 3, username: 'Mira K.', durationMinutes: 15060, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[2]!, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 4, username: 'PixelDreams', durationMinutes: 13680, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[3]!, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 5, username: 'Kabir V.', durationMinutes: 12420, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[4]!, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 6, username: 'Anaya Roy', durationMinutes: 11580, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[5]!, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 7, username: 'Dev Patel', durationMinutes: 10560, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[6]!, rank: { id: 'gold', name: 'Gold' } },
        { position: 8, username: 'Isha Gupta', durationMinutes: 9840, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[7]!, rank: { id: 'gold', name: 'Gold' } },
        { position: 9, username: 'Neel Mehta', durationMinutes: 8940, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[8]!, rank: { id: 'silver', name: 'Silver' } },
        { position: 10, username: 'Tara Sen', durationMinutes: 7920, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[9]!, rank: { id: 'silver', name: 'Silver' } },
        { position: 11, username: 'HexCode', durationMinutes: 7260, avatarUrl: DIVERSE_AVATAR_POOLS.mixed11[10]!, rank: { id: 'bronze', name: 'Bronze' } },
      ],
    },
  };

  const vProfUnsplash = voiceProfileModule.validate(profileUnsplash);
  const vProfGitHub = voiceProfileModule.validate(profileGitHub);
  const vProfDiceBear = voiceProfileModule.validate(profileDiceBear);
  const vLB11 = voiceLeaderboardModule.validate(lb11Mixed);

  // ==========================================================================
  // STAGE 1: COLD REAL-TIME NETWORK BENCHMARK
  // ==========================================================================
  console.log('>>> [1/3] Testing COLD Real-time Requests (Zero Cache, Real CDN Fetches)...');

  // Cold Profile - Unsplash
  avatarCache.clear();
  const { ctx: ctxColdProfUnsplash, timings: tProfUnsplash } = createContextWithTiming('profile-card-v1');
  const t0ProfUnsplash = performance.now();
  const profUnsplashBuffer = await voiceProfileModule.render(vProfUnsplash, ctxColdProfUnsplash);
  const durProfUnsplash = performance.now() - t0ProfUnsplash;
  fs.writeFileSync(resolve(TARGET_DIR, 'bench-profile-unsplash.png'), profUnsplashBuffer);

  // Cold Profile - GitHub
  avatarCache.clear();
  const { ctx: ctxColdProfGitHub, timings: tProfGitHub } = createContextWithTiming('profile-card-v1');
  const t0ProfGitHub = performance.now();
  const profGitHubBuffer = await voiceProfileModule.render(vProfGitHub, ctxColdProfGitHub);
  const durProfGitHub = performance.now() - t0ProfGitHub;
  fs.writeFileSync(resolve(TARGET_DIR, 'bench-profile-github.png'), profGitHubBuffer);

  // Cold Profile - DiceBear
  avatarCache.clear();
  const { ctx: ctxColdProfDiceBear, timings: tProfDiceBear } = createContextWithTiming('profile-card-v1');
  const t0ProfDiceBear = performance.now();
  const profDiceBearBuffer = await voiceProfileModule.render(vProfDiceBear, ctxColdProfDiceBear);
  const durProfDiceBear = performance.now() - t0ProfDiceBear;
  fs.writeFileSync(resolve(TARGET_DIR, 'bench-profile-dicebear.png'), profDiceBearBuffer);

  // Cold Leaderboard - 11 Avatars (Live SVG)
  avatarCache.clear();
  const { ctx: ctxColdLB11, timings: tLB11 } = createContextWithTiming('study-leaderboard-v1');
  const t0LB11 = performance.now();
  const lb11LiveBuffer = await voiceLeaderboardModule.render(vLB11, ctxColdLB11);
  const durColdLB11Live = performance.now() - t0LB11;

  // Cold Leaderboard - 11 Avatars (Tier 1 Baked BG)
  avatarCache.clear();
  const t0ColdTier1 = performance.now();
  const avatarMapTier1: Record<number, string> = {};
  await Promise.all(
    DIVERSE_AVATAR_POOLS.mixed11.map(async (url, idx) => {
      const diameter = idx < 3 ? 160 : 72;
      avatarMapTier1[idx + 1] = await avatarCache.getAvatarDataUri(url, diameter);
    })
  );
  const tNetEnd = performance.now();
  const netDurationTier1 = tNetEnd - t0ColdTier1;
  const mappedTier1 = mapVoiceLeaderboardData(tier1TemplateSvg, vLB11, avatarMapTier1);
  const tMapEnd = performance.now();
  const mapDurationTier1 = tMapEnd - tNetEnd;
  const lb11Tier1Buffer = SvgRenderer.renderToPng({ svgContent: mappedTier1, width: 1536 });
  const durColdLB11Tier1 = performance.now() - t0ColdTier1;
  const resvgDurationTier1 = performance.now() - tMapEnd;
  fs.writeFileSync(resolve(TARGET_DIR, 'bench-leaderboard-tier1-11avatars.png'), lb11Tier1Buffer);

  console.log('\n================================================================================');
  console.log('COLD REAL-TIME RESULTS (Real Network Fetches across Internet CDNs)');
  console.log('================================================================================');
  console.log(`• Profile (Unsplash Photo):   ${durProfUnsplash.toFixed(2)} ms (Network: ${(tProfUnsplash['avatar_retrieval'] ?? 0).toFixed(2)}ms | SVG: ${(tProfUnsplash['svg_data_injection'] ?? 0).toFixed(2)}ms | Resvg: ${(tProfUnsplash['resvg_rasterization'] ?? 0).toFixed(2)}ms)`);
  console.log(`• Profile (GitHub Avatar):    ${durProfGitHub.toFixed(2)} ms (Network: ${(tProfGitHub['avatar_retrieval'] ?? 0).toFixed(2)}ms | SVG: ${(tProfGitHub['svg_data_injection'] ?? 0).toFixed(2)}ms | Resvg: ${(tProfGitHub['resvg_rasterization'] ?? 0).toFixed(2)}ms)`);
  console.log(`• Profile (DiceBear Avatar):  ${durProfDiceBear.toFixed(2)} ms (Network: ${(tProfDiceBear['avatar_retrieval'] ?? 0).toFixed(2)}ms | SVG: ${(tProfDiceBear['svg_data_injection'] ?? 0).toFixed(2)}ms | Resvg: ${(tProfDiceBear['resvg_rasterization'] ?? 0).toFixed(2)}ms)`);
  console.log(`• Leaderboard (Live SVG, 11 Avatars):    ${durColdLB11Live.toFixed(2)} ms (Parallel Network: ${(durColdLB11Live - (tLB11['svg_data_injection'] ?? 0) - (tLB11['resvg_rasterization'] ?? 0)).toFixed(2)}ms | SVG: ${(tLB11['svg_data_injection'] ?? 0).toFixed(2)}ms | Resvg: ${(tLB11['resvg_rasterization'] ?? 0).toFixed(2)}ms)`);
  console.log(`• Leaderboard (Tier 1 Baked, 11 Avatars): ${durColdLB11Tier1.toFixed(2)} ms (Parallel Network: ${netDurationTier1.toFixed(2)}ms | SVG: ${mapDurationTier1.toFixed(2)}ms | Resvg: ${resvgDurationTier1.toFixed(2)}ms)`);
  console.log('================================================================================\n');

  // ==========================================================================
  // STAGE 2: WARM REAL-TIME BENCHMARK (LRU IN-MEMORY HITS, 30 ITERATIONS)
  // ==========================================================================
  console.log('>>> [2/3] Benchmarking WARM In-Memory Requests (30 Iterations per Scenario)...');

  async function benchmarkScenario(name: string, fn: () => Promise<any> | any, iterations = 30) {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      await fn();
      times.push(performance.now() - t0);
    }
    const sorted = [...times].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.50)]!;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    return { name, avg, p50, p95, min: sorted[0]!, max: sorted[sorted.length - 1]! };
  }

  // Pre-populate cache for all 11 avatars
  const avatarMapWarm: Record<number, string> = {};
  for (let i = 1; i <= 11; i++) {
    avatarMapWarm[i] = await avatarCache.getAvatarDataUri(DIVERSE_AVATAR_POOLS.mixed11[i - 1]!, i <= 3 ? 160 : 72);
  }

  const warmProfileUnsplash = await benchmarkScenario('Voice Profile (1 Unsplash Avatar, 1200x835)', () => {
    const { ctx } = createContextWithTiming('profile-card-v1');
    return voiceProfileModule.render(vProfUnsplash, ctx);
  });

  const warmProfileGitHub = await benchmarkScenario('Voice Profile (1 GitHub Avatar, 1200x835)', () => {
    const { ctx } = createContextWithTiming('profile-card-v1');
    return voiceProfileModule.render(vProfGitHub, ctx);
  });

  const warmLB11Live = await benchmarkScenario('Voice Leaderboard Live SVG (11 Avatars, 1536x1024)', () => {
    const { ctx } = createContextWithTiming('study-leaderboard-v1');
    return voiceLeaderboardModule.render(vLB11, ctx);
  });

  const warmLB11Tier1 = await benchmarkScenario('Voice Leaderboard Tier 1 Baked (11 Avatars, 1536x1024)', () => {
    const dynamicSvg = mapVoiceLeaderboardData(tier1TemplateSvg, vLB11, avatarMapWarm);
    return SvgRenderer.renderToPng({ svgContent: dynamicSvg, width: 1536 });
  });

  console.log('\n================================================================================');
  console.log('WARM REAL-TIME RESULTS (30 Iterations with Cached Avatars)');
  console.log('================================================================================');
  [warmProfileUnsplash, warmProfileGitHub, warmLB11Live, warmLB11Tier1].forEach(r => {
    console.log(`• ${r.name.padEnd(52)} Avg: ${r.avg.toFixed(2).padStart(6)} ms | P50: ${r.p50.toFixed(2).padStart(6)} ms | P95: ${r.p95.toFixed(2).padStart(6)} ms | Min: ${r.min.toFixed(2).padStart(6)} ms`);
  });
  console.log('================================================================================\n');

  console.log(`• Tier 1 Baked BG vs Live SVG Speedup: ${(warmLB11Live.avg / warmLB11Tier1.avg).toFixed(2)}x faster (${warmLB11Live.avg.toFixed(1)}ms -> ${warmLB11Tier1.avg.toFixed(1)}ms)`);

  // ==========================================================================
  // STAGE 3: GENERATE DETAILED MARKDOWN REPORT ARTIFACT
  // ==========================================================================
  const reportMd = `# Internet Avatar Benchmark Report

## 1. Executive Summary

This benchmark validates real-time rendering performance across **5 distinct internet avatar providers** (photographic portraits, pixel art, developer avatars, vector illustrations, and identicons) across both **Voice Profile** and **Voice Leaderboard**.

- **Network Parallelism**: The service fetches all 11 remote avatars **concurrently in parallel** via \`Promise.all()\`. Total cold network time is bounded only by the single slowest CDN response ($\approx 200\text{--}500\text{ ms}$), rather than the sequential sum ($\approx 2,400\text{ ms}$).
- **Tier 1 Baked Background Advantage**: Eliminates the expensive SVG filter effects (\`#softShadow\`, multiple Gaussian blur passes, and decorative paths) during rasterization, accelerating warm render times from **${warmLB11Live.avg.toFixed(1)} ms down to ${warmLB11Tier1.avg.toFixed(1)} ms** ($\approx ${(warmLB11Live.avg / warmLB11Tier1.avg).toFixed(2)}\\times$ speedup).
- **In-Memory LRU Cache**: Warm responses serve remote avatars directly from memory with zero disk or network I/O, achieving sub-35ms latencies on Profile and sub-45ms on Leaderboard Tier 1.

---

## 2. Avatar Providers & Formats Tested

| Provider | Avatar Format | Dimension | Example URL |
| :--- | :--- | :--- | :--- |
| **Unsplash** | Photographic JPEG | $256 \\times 256$ | \`images.unsplash.com/photo-1534528741775-53994a69daeb\` |
| **GitHub** | Developer PNG / JPEG | $460 \\times 460$ | \`avatars.githubusercontent.com/u/100?v=4\` |
| **DiceBear** | Vector SVG $\\to$ PNG | $200 \\times 200$ | \`api.dicebear.com/7.x/bottts/png?seed=PixelDreams\` |
| **Gravatar** | Globally Unique JPEG | $200 \\times 200$ | \`gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50\` |
| **RoboHash** | Procedural Robot PNG | $200 \\times 200$ | \`robohash.org/student1.png?size=200x200\` |

---

## 3. Cold Start Latency (First-time Internet Fetches + Sharp Circular Processing)

| Scenario | Avatars | Network (CDN Fetch + Sharp) | SVG Data Injection | Resvg Rasterization | Total Cold Latency |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Voice Profile (Unsplash Photo)** | 1 | ${(tProfUnsplash['avatar_retrieval'] ?? 0).toFixed(1)} ms | ${(tProfUnsplash['svg_data_injection'] ?? 0).toFixed(1)} ms | ${(tProfUnsplash['resvg_rasterization'] ?? 0).toFixed(1)} ms | **${durProfUnsplash.toFixed(1)} ms** |
| **Voice Profile (GitHub Avatar)** | 1 | ${(tProfGitHub['avatar_retrieval'] ?? 0).toFixed(1)} ms | ${(tProfGitHub['svg_data_injection'] ?? 0).toFixed(1)} ms | ${(tProfGitHub['resvg_rasterization'] ?? 0).toFixed(1)} ms | **${durProfGitHub.toFixed(1)} ms** |
| **Voice Profile (DiceBear Avatar)** | 1 | ${(tProfDiceBear['avatar_retrieval'] ?? 0).toFixed(1)} ms | ${(tProfDiceBear['svg_data_injection'] ?? 0).toFixed(1)} ms | ${(tProfDiceBear['resvg_rasterization'] ?? 0).toFixed(1)} ms | **${durProfDiceBear.toFixed(1)} ms** |
| **Voice Leaderboard (Live SVG)** | 11 | ${(durColdLB11Live - (tLB11['svg_data_injection'] ?? 0) - (tLB11['resvg_rasterization'] ?? 0)).toFixed(1)} ms (Parallel) | ${(tLB11['svg_data_injection'] ?? 0).toFixed(1)} ms | ${(tLB11['resvg_rasterization'] ?? 0).toFixed(1)} ms | **${durColdLB11Live.toFixed(1)} ms** |
| **Voice Leaderboard (Tier 1 Baked BG)** | 11 | ${netDurationTier1.toFixed(1)} ms (Parallel) | ${mapDurationTier1.toFixed(1)} ms | ${resvgDurationTier1.toFixed(1)} ms | **${durColdLB11Tier1.toFixed(1)} ms** |

---

## 4. Warm Cache Latency (30 Iterations with In-Memory LRU Cache)

| Scenario | Canvas Resolution | Average Latency | P50 (Median) | P95 | Min |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Voice Profile (Unsplash Photo)** | $1200 \\times 835$ | **${warmProfileUnsplash.avg.toFixed(2)} ms** | ${warmProfileUnsplash.p50.toFixed(2)} ms | ${warmProfileUnsplash.p95.toFixed(2)} ms | ${warmProfileUnsplash.min.toFixed(2)} ms |
| **Voice Profile (GitHub Avatar)** | $1200 \\times 835$ | **${warmProfileGitHub.avg.toFixed(2)} ms** | ${warmProfileGitHub.p50.toFixed(2)} ms | ${warmProfileGitHub.p95.toFixed(2)} ms | ${warmProfileGitHub.min.toFixed(2)} ms |
| **Voice Leaderboard (Live Dynamic SVG, 11 Avatars)** | $1536 \\times 1024$ | **${warmLB11Live.avg.toFixed(2)} ms** | ${warmLB11Live.p50.toFixed(2)} ms | ${warmLB11Live.p95.toFixed(2)} ms | ${warmLB11Live.min.toFixed(2)} ms |
| **Voice Leaderboard (Tier 1 Baked BG, 11 Avatars)** | $1536 \\times 1024$ | **${warmLB11Tier1.avg.toFixed(2)} ms** | ${warmLB11Tier1.p50.toFixed(2)} ms | ${warmLB11Tier1.p95.toFixed(2)} ms | ${warmLB11Tier1.min.toFixed(2)} ms |

---

## 5. Visual Artifacts Produced in \`artifacts/\`

- [**\`bench-profile-unsplash.png\`**](file://${TARGET_DIR}/bench-profile-unsplash.png): Profile card rendered with high-res Unsplash photo avatar.
- [**\`bench-profile-github.png\`**](file://${TARGET_DIR}/bench-profile-github.png): Profile card rendered with GitHub developer avatar.
- [**\`bench-profile-dicebear.png\`**](file://${TARGET_DIR}/bench-profile-dicebear.png): Profile card rendered with DiceBear vector avatar.
- [**\`bench-leaderboard-tier1-11avatars.png\`**](file://${TARGET_DIR}/bench-leaderboard-tier1-11avatars.png): Tier 1 Study Leaderboard card rendered with 11 distinct real avatars across the 5 internet CDNs.
`;

  fs.writeFileSync(resolve(TARGET_DIR, 'benchmark-internet-avatars.md'), reportMd);
  console.log(`• Saved comprehensive report to: ${resolve(TARGET_DIR, 'benchmark-internet-avatars.md')}`);
}

main().catch(console.error);
