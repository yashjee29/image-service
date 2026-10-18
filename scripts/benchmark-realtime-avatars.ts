import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { avatarCache } from '../src/core/images/avatar-cache.js';
import { voiceProfileModule } from '../src/modules/voice-profile/index.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';

// Real internet avatar URLs from GitHub CDN
const GITHUB_AVATARS = [
  'https://avatars.githubusercontent.com/u/1?v=4',  // mojombo
  'https://avatars.githubusercontent.com/u/2?v=4',  // defunkt
  'https://avatars.githubusercontent.com/u/3?v=4',  // pjhyett
  'https://avatars.githubusercontent.com/u/4?v=4',  // wycats
  'https://avatars.githubusercontent.com/u/5?v=4',  // ezmobius
  'https://avatars.githubusercontent.com/u/6?v=4',  // ivey
  'https://avatars.githubusercontent.com/u/7?v=4',  // evanphx
  'https://avatars.githubusercontent.com/u/8?v=4',  // vanpelt
  'https://avatars.githubusercontent.com/u/9?v=4',  // wayneeseguin
  'https://avatars.githubusercontent.com/u/10?v=4', // brynary
  'https://avatars.githubusercontent.com/u/11?v=4', // kevinclark
];

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

async function main() {
  fontRegistry.initialize();
  await rankAssetCache.initialize(256);
  await leaderboardAssetCache.initialize(160);

  console.log('================================================================================');
  console.log('REAL-TIME INTERNET AVATAR BENCHMARK: VOICE PROFILE vs VOICE LEADERBOARD');
  console.log('================================================================================\n');

  // Profile Payload with 1 real internet avatar
  const profilePayload = {
    schemaVersion: '1.0',
    requestId: 'realtime-profile-001',
    render: {
      templateId: 'profile-card-v1',
      format: 'png',
      scale: 1,
    },
    profile: {
      userId: 'user-001',
      username: 'Sakha',
      avatarUrl: GITHUB_AVATARS[0],
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

  // Leaderboard Payload with 11 real internet avatars
  const leaderboardPayload11 = {
    schemaVersion: '1.0',
    requestId: 'realtime-lb-011',
    render: {
      templateId: 'study-leaderboard-v1',
      format: 'png',
      scale: 1,
    },
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: [
        { position: 1, username: 'Aarav', durationMinutes: 19260, avatarUrl: GITHUB_AVATARS[0], rank: { id: 'immortal', name: 'Immortal' } },
        { position: 2, username: 'Sakha', durationMinutes: 17040, avatarUrl: GITHUB_AVATARS[1], rank: { id: 'ascendant', name: 'Ascendant' } },
        { position: 3, username: 'Mira', durationMinutes: 15060, avatarUrl: GITHUB_AVATARS[2], rank: { id: 'diamond', name: 'Diamond' } },
        { position: 4, username: 'PixelDreams', durationMinutes: 13680, avatarUrl: GITHUB_AVATARS[3], rank: { id: 'diamond', name: 'Diamond' } },
        { position: 5, username: 'Kabir', durationMinutes: 12420, avatarUrl: GITHUB_AVATARS[4], rank: { id: 'diamond', name: 'Diamond' } },
        { position: 6, username: 'Anaya', durationMinutes: 11580, avatarUrl: GITHUB_AVATARS[5], rank: { id: 'platinum', name: 'Platinum' } },
        { position: 7, username: 'Dev', durationMinutes: 10560, avatarUrl: GITHUB_AVATARS[6], rank: { id: 'gold', name: 'Gold' } },
        { position: 8, username: 'Isha', durationMinutes: 9840, avatarUrl: GITHUB_AVATARS[7], rank: { id: 'gold', name: 'Gold' } },
        { position: 9, username: 'Neel', durationMinutes: 8940, avatarUrl: GITHUB_AVATARS[8], rank: { id: 'silver', name: 'Silver' } },
        { position: 10, username: 'Tara', durationMinutes: 7920, avatarUrl: GITHUB_AVATARS[9], rank: { id: 'silver', name: 'Silver' } },
        { position: 11, username: 'HexCode', durationMinutes: 7260, avatarUrl: GITHUB_AVATARS[10], rank: { id: 'bronze', name: 'Bronze' } },
      ],
    },
  };

  // Leaderboard Payload with 1 real internet avatar (matching Profile)
  const leaderboardPayload1 = JSON.parse(JSON.stringify(leaderboardPayload11));
  leaderboardPayload1.leaderboard.entries = leaderboardPayload1.leaderboard.entries.map((e: any, idx: number) => {
    if (idx > 0) delete e.avatarUrl;
    return e;
  });

  const vProfile = voiceProfileModule.validate(profilePayload);
  const vLB11 = voiceLeaderboardModule.validate(leaderboardPayload11);
  const vLB1 = voiceLeaderboardModule.validate(leaderboardPayload1);

  // --------------------------------------------------------------------------
  // STAGE 1: COLD START (REAL INTERNET NETWORK REQUESTS)
  // --------------------------------------------------------------------------
  console.log('>>> [1/2] Testing COLD Real-time Requests (Zero Cache, Real GitHub CDN Fetches)...');

  // Cold Profile
  avatarCache.clear();
  const { ctx: ctxColdProfile, timings: timingsProfile } = createContextWithTiming('profile-card-v1');
  const t0ColdProfile = performance.now();
  await voiceProfileModule.render(vProfile, ctxColdProfile);
  const coldProfileDuration = performance.now() - t0ColdProfile;

  // Cold Leaderboard (1 Avatar)
  avatarCache.clear();
  const { ctx: ctxColdLB1, timings: timingsLB1 } = createContextWithTiming('study-leaderboard-v1');
  const t0ColdLB1 = performance.now();
  await voiceLeaderboardModule.render(vLB1, ctxColdLB1);
  const coldLB1Duration = performance.now() - t0ColdLB1;

  // Cold Leaderboard (11 Avatars)
  avatarCache.clear();
  const { ctx: ctxColdLB11, timings: timingsLB11 } = createContextWithTiming('study-leaderboard-v1');
  const t0ColdLB11 = performance.now();
  await voiceLeaderboardModule.render(vLB11, ctxColdLB11);
  const coldLB11Duration = performance.now() - t0ColdLB11;

  console.log('\n================================================================================');
  console.log('COLD REAL-TIME RESULTS (Real Network Fetches from GitHub CDN)');
  console.log('================================================================================');
  console.log(`• Voice Profile (1 Remote Avatar, 1200x835):`);
  console.log(`    Total:      ${coldProfileDuration.toFixed(2)} ms`);
  console.log(`    Network+Sharp: ${(timingsProfile['avatar_retrieval'] ?? 0).toFixed(2)} ms`);
  console.log(`    SVG Inject: ${(timingsProfile['svg_data_injection'] ?? 0).toFixed(2)} ms`);
  console.log(`    Resvg PNG:  ${(timingsProfile['resvg_rasterization'] ?? 0).toFixed(2)} ms`);

  console.log(`\n• Voice Leaderboard (1 Remote Avatar, 1536x1024):`);
  console.log(`    Total:      ${coldLB1Duration.toFixed(2)} ms`);
  console.log(`    Network+Sharp: ${(timingsLB1['avatar_fetch_1'] ?? 0).toFixed(2)} ms`);
  console.log(`    SVG Inject: ${(timingsLB1['svg_data_injection'] ?? 0).toFixed(2)} ms`);
  console.log(`    Resvg PNG:  ${(timingsLB1['resvg_rasterization'] ?? 0).toFixed(2)} ms`);

  const lb11AvatarFetchTotal = Object.keys(timingsLB11)
    .filter(k => k.startsWith('avatar_fetch_'))
    .reduce((acc, k) => acc + timingsLB11[k]!, 0);

  console.log(`\n• Voice Leaderboard (11 Remote Avatars concurrently, 1536x1024):`);
  console.log(`    Total:      ${coldLB11Duration.toFixed(2)} ms`);
  console.log(`    Network+Sharp (Parallel): ${(coldLB11Duration - (timingsLB11['resvg_rasterization'] ?? 0) - (timingsLB11['svg_data_injection'] ?? 0)).toFixed(2)} ms (Sum of tasks: ${lb11AvatarFetchTotal.toFixed(2)} ms)`);
  console.log(`    SVG Inject: ${(timingsLB11['svg_data_injection'] ?? 0).toFixed(2)} ms`);
  console.log(`    Resvg PNG:  ${(timingsLB11['resvg_rasterization'] ?? 0).toFixed(2)} ms`);
  console.log('================================================================================\n');

  // --------------------------------------------------------------------------
  // STAGE 2: WARM CACHE (IN-MEMORY LRU CACHE HITS, 30 ITERATIONS)
  // --------------------------------------------------------------------------
  console.log('>>> [2/2] Testing WARM Real-time Requests (Avatars Cached in Memory, 30 iterations)...');

  // Warmup renders
  const { ctx: ctxW1 } = createContextWithTiming('profile-card-v1');
  await voiceProfileModule.render(vProfile, ctxW1);
  const { ctx: ctxW2 } = createContextWithTiming('study-leaderboard-v1');
  await voiceLeaderboardModule.render(vLB11, ctxW2);

  const iterations = 30;
  async function benchmarkScenario(name: string, fn: () => Promise<any>) {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      await fn();
      times.push(performance.now() - t0);
    }
    const sorted = [...times].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.50)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    return { name, avg, p50, p95, min: sorted[0], max: sorted[sorted.length - 1] };
  }

  const warmProfile = await benchmarkScenario('Voice Profile (1 Avatar, 1200x835)', () => {
    const { ctx } = createContextWithTiming('profile-card-v1');
    return voiceProfileModule.render(vProfile, ctx);
  });

  const warmLB1 = await benchmarkScenario('Voice Leaderboard (1 Avatar, 1536x1024)', () => {
    const { ctx } = createContextWithTiming('study-leaderboard-v1');
    return voiceLeaderboardModule.render(vLB1, ctx);
  });

  const warmLB11 = await benchmarkScenario('Voice Leaderboard (11 Avatars, 1536x1024)', () => {
    const { ctx } = createContextWithTiming('study-leaderboard-v1');
    return voiceLeaderboardModule.render(vLB11, ctx);
  });

  console.log('\n================================================================================');
  console.log('WARM REAL-TIME RESULTS (30 Iterations with Cached Avatars)');
  console.log('================================================================================');
  [warmProfile, warmLB1, warmLB11].forEach(r => {
    console.log(`• ${r.name}:`);
    console.log(`    Avg: ${r.avg.toFixed(2)} ms | P50: ${r.p50.toFixed(2)} ms | P95: ${r.p95.toFixed(2)} ms | Range: ${r.min.toFixed(2)} - ${r.max.toFixed(2)} ms`);
  });
  console.log('================================================================================\n');
}

main().catch(console.error);
