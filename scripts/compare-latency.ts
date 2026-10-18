import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { avatarCache } from '../src/core/images/avatar-cache.js';
import { voiceProfileModule } from '../src/modules/voice-profile/index.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';
import sharp from 'sharp';

async function main() {
  fontRegistry.initialize();
  await rankAssetCache.initialize();
  await leaderboardAssetCache.initialize(160);

  // Create local dummy avatar buffer for consistent zero-network benchmark
  const testAvatarBuf = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 66, g: 133, b: 244, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const dummyAvatarUrl = 'https://dummy.example.com/avatar.png';
  await avatarCache.getAvatarDataUri(testAvatarBuf, 167);

  // Profile Payload (1 avatar, current & next rank)
  const profilePayload = {
    schemaVersion: '1.0',
    requestId: 'perf-profile-001',
    render: {
      templateId: 'profile-card-v1',
      format: 'png',
      scale: 1,
    },
    profile: {
      userId: 'user-001',
      username: 'Sakha',
      avatarUrl: dummyAvatarUrl,
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

  // Leaderboard Payload (11 avatars, 11 ranks)
  const leaderboardPayload11 = {
    schemaVersion: '1.0',
    requestId: 'perf-lb-011',
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
        { position: 1, username: 'Aarav', durationMinutes: 19260, avatarUrl: dummyAvatarUrl, rank: { id: 'immortal', name: 'Immortal' } },
        { position: 2, username: 'Sakha', durationMinutes: 17040, avatarUrl: dummyAvatarUrl, rank: { id: 'ascendant', name: 'Ascendant' } },
        { position: 3, username: 'Mira', durationMinutes: 15060, avatarUrl: dummyAvatarUrl, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 4, username: 'PixelDreams', durationMinutes: 13680, avatarUrl: dummyAvatarUrl, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 5, username: 'Kabir', durationMinutes: 12420, avatarUrl: dummyAvatarUrl, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 6, username: 'Anaya', durationMinutes: 11580, avatarUrl: dummyAvatarUrl, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 7, username: 'Dev', durationMinutes: 10560, avatarUrl: dummyAvatarUrl, rank: { id: 'gold', name: 'Gold' } },
        { position: 8, username: 'Isha', durationMinutes: 9840, avatarUrl: dummyAvatarUrl, rank: { id: 'gold', name: 'Gold' } },
        { position: 9, username: 'Neel', durationMinutes: 8940, avatarUrl: dummyAvatarUrl, rank: { id: 'silver', name: 'Silver' } },
        { position: 10, username: 'Tara', durationMinutes: 7920, avatarUrl: dummyAvatarUrl, rank: { id: 'silver', name: 'Silver' } },
        { position: 11, username: 'HexCode', durationMinutes: 7260, avatarUrl: dummyAvatarUrl, rank: { id: 'bronze', name: 'Bronze' } },
      ],
    },
  };

  // Leaderboard Payload with 1 avatar (same as profile)
  const leaderboardPayload1 = JSON.parse(JSON.stringify(leaderboardPayload11));
  leaderboardPayload1.leaderboard.entries = leaderboardPayload1.leaderboard.entries.map((e: any, idx: number) => {
    if (idx > 0) delete e.avatarUrl;
    return e;
  });

  // Leaderboard Payload without avatars (vector fallbacks)
  const leaderboardPayload0 = JSON.parse(JSON.stringify(leaderboardPayload11));
  leaderboardPayload0.leaderboard.entries.forEach((e: any) => delete e.avatarUrl);

  // Warmup renders
  const vP = voiceProfileModule.validate(profilePayload);
  const cP = createRenderContext('profile-card-v1');
  await voiceProfileModule.render(vP, cP);

  const vL11 = voiceLeaderboardModule.validate(leaderboardPayload11);
  const cL11 = createRenderContext('study-leaderboard-v1');
  await voiceLeaderboardModule.render(vL11, cL11);

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

  console.log('Running comparative benchmark (30 iterations each)...');
  const resProfile = await benchmarkScenario('Voice Profile (1 Avatar, 2 Ranks, 1200x835)', () => {
    const ctx = createRenderContext('profile-card-v1');
    return voiceProfileModule.render(vP, ctx);
  });

  const resLB11 = await benchmarkScenario('Voice Leaderboard (11 Avatars, 14 Icons/Medals, 1536x1024)', () => {
    const ctx = createRenderContext('study-leaderboard-v1');
    return voiceLeaderboardModule.render(vL11, ctx);
  });

  const resLB1 = await benchmarkScenario('Voice Leaderboard (1 Avatar, 14 Icons/Medals, 1536x1024)', () => {
    const v = voiceLeaderboardModule.validate(leaderboardPayload1);
    const ctx = createRenderContext('study-leaderboard-v1');
    return voiceLeaderboardModule.render(v, ctx);
  });

  const resLB0 = await benchmarkScenario('Voice Leaderboard (0 Avatars - Vector Fallbacks, 1536x1024)', () => {
    const v = voiceLeaderboardModule.validate(leaderboardPayload0);
    const ctx = createRenderContext('study-leaderboard-v1');
    return voiceLeaderboardModule.render(v, ctx);
  });

  console.log('\n================================================================================');
  console.log('EMPIRICAL LATENCY BREAKDOWN');
  console.log('================================================================================');
  [resProfile, resLB11, resLB1, resLB0].forEach(r => {
    console.log(`• ${r.name}:`);
    console.log(`    Avg: ${r.avg.toFixed(2)} ms | P50: ${r.p50.toFixed(2)} ms | P95: ${r.p95.toFixed(2)} ms | Range: ${r.min.toFixed(2)} - ${r.max.toFixed(2)} ms`);
  });
  console.log('================================================================================\n');
}

main().catch(console.error);
