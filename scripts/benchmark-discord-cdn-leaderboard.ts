import fs from 'node:fs';
import { resolve } from 'node:path';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { avatarCache } from '../src/core/images/avatar-cache.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { renderVoiceLeaderboard } from '../src/modules/voice-leaderboard/renderer.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';

const ARTIFACT_DIR = '/Users/yashjee/.gemini/antigravity/brain/558b160c-a309-418a-849c-7b34546f9026';

// 11 Unique Live Discord CDN Avatars
export const DISCORD_CDN_AVATARS = [
  { rank: 1, name: 'Aarav', url: 'https://cdn.discordapp.com/avatars/159985870458322944/765030df32975c5b23f8dfe86d6ff520.png' }, // MEE6
  { rank: 2, name: 'Sakha', url: 'https://cdn.discordapp.com/avatars/155149108183695360/b4fdfc64edff74c37e1574d34fad66c2.png' }, // Dyno
  { rank: 3, name: 'Mira', url: 'https://cdn.discordapp.com/avatars/270904126974590976/cdf4f2cfaf99b4fc6bdbf050f917f6b2.png' },  // Dank Memer
  { rank: 4, name: 'PixelDreams', url: 'https://cdn.discordapp.com/avatars/282859044593598464/156a0d2872579f1ffcaa5d2127239bfd.png' }, // ProBot
  { rank: 5, name: 'Kabir', url: 'https://cdn.discordapp.com/avatars/235088799074484224/a_bf76f4b59ab50da1065df1144d5cf46b.png' }, // Rythm
  { rank: 6, name: 'Anaya', url: 'https://cdn.discordapp.com/avatars/557628352828014614/dd89587457ef9f971d331426cad9e2be.png' }, // Ticket Tool
  { rank: 7, name: 'Dev', url: 'https://cdn.discordapp.com/avatars/432610292342587392/29cb28fbf65a3958105026ab03abd306.png' },   // Mudae
  { rank: 8, name: 'Isha', url: 'https://cdn.discordapp.com/avatars/437808476106784770/def5e0a7ff07e73d477a87df10a3dc4f.png' },  // Arcane
  { rank: 9, name: 'Neel', url: 'https://cdn.discordapp.com/embed/avatars/0.png' },                                              // Discord Blurple
  { rank: 10, name: 'Tara', url: 'https://cdn.discordapp.com/embed/avatars/1.png' },                                             // Discord Gray
  { rank: 11, name: 'HexCode', url: 'https://cdn.discordapp.com/embed/avatars/2.png' },                                          // Discord Green
];

function createContextWithTiming(moduleId: string) {
  const timings: Record<string, number> = {};
  const measureFn = async <T>(stage: string, fn: () => Promise<T> | T): Promise<T> => {
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      timings[stage] = performance.now() - t0;
    }
  };

  const context = createRenderContext(moduleId, undefined, measureFn);
  return { context, timings };
}

async function runBenchmark() {
  fontRegistry.initialize();
  await rankAssetCache.initialize();
  await leaderboardAssetCache.initialize();

  console.log('================================================================================');
  console.log('  DISCORD CDN (cdn.discordapp.com) - 11 UNIQUE AVATARS LATENCY BENCHMARK');
  console.log('================================================================================\n');

  // Verify avatar reachability and measure raw HTTP fetch latency
  console.log('--- 1. Individual Discord CDN Avatar Network Fetch Latency ---');
  for (const item of DISCORD_CDN_AVATARS) {
    const t0 = performance.now();
    const res = await fetch(item.url);
    const buf = await res.arrayBuffer();
    const elapsed = performance.now() - t0;
    console.log(`[Rank #${String(item.rank).padStart(2, ' ')}] ${item.name.padEnd(12)} | Status: ${res.status} | Size: ${(buf.byteLength / 1024).toFixed(1).padStart(5, ' ')} KB | Net Latency: ${elapsed.toFixed(2)} ms`);
  }

  // Clear LRU cache to test True Cold Start
  avatarCache.clear();

  console.log('\n--- 2. COLD START TEST: 11 Discord CDN Avatars Fetched In Parallel + Rendered ---');
  const coldPayload = {
    schemaVersion: '1.0',
    requestId: 'discord-cdn-cold-001',
    requestContext: { requesterUserId: 'user-002' },
    render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1, layout: 'podium_and_list', highlightRequester: true },
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: DISCORD_CDN_AVATARS.map((item, idx) => ({
        position: item.rank,
        userId: `user-00${item.rank}`,
        username: item.name,
        avatarUrl: item.url,
        durationMinutes: 19260 - idx * 1200,
        rank: {
          id: idx === 0 ? 'immortal' : (idx === 1 ? 'ascendant' : (idx < 5 ? 'diamond' : (idx < 7 ? 'platinum' : (idx < 9 ? 'gold' : (idx < 11 ? 'silver' : 'bronze'))))),
          name: idx === 0 ? 'Immortal' : (idx === 1 ? 'Ascendant' : (idx < 5 ? 'Diamond' : (idx < 7 ? 'Platinum' : (idx < 9 ? 'Gold' : (idx < 11 ? 'Silver' : 'Bronze'))))),
        },
      })),
    },
  };

  const { context: coldContext, timings: coldTimings } = createContextWithTiming('study-leaderboard-2');
  const coldStart = performance.now();
  const validatedCold = voiceLeaderboardModule.validate(coldPayload);
  const coldValidationMs = performance.now() - coldStart;

  const coldPng = await renderVoiceLeaderboard(validatedCold, coldContext);
  const totalColdMs = performance.now() - coldStart;

  // Save artifact
  const artifactPath = resolve(ARTIFACT_DIR, 'discord-cdn-leaderboard.png');
  fs.writeFileSync(artifactPath, coldPng);
  fs.writeFileSync(resolve(process.cwd(), 'artifacts/discord-cdn-leaderboard.png'), coldPng);
  console.log(`Saved output image to ${artifactPath}`);

  let totalAvatarColdMs = 0;
  for (let r = 1; r <= 11; r++) {
    totalAvatarColdMs += coldTimings[`avatar_fetch_${r}`] || 0;
  }
  const parallelAvatarTime = (coldTimings['avatar_fetch_1'] !== undefined)
    ? Math.max(...Array.from({ length: 11 }, (_, i) => coldTimings[`avatar_fetch_${i + 1}`] || 0))
    : 0;

  console.log(`\n• Cold Start Total Time:              ${totalColdMs.toFixed(2)} ms`);
  console.log(`  - Zod Validation:                   ${coldValidationMs.toFixed(2)} ms`);
  console.log(`  - 11 Avatars Parallel Fetch & Sharp:${parallelAvatarTime.toFixed(2)} ms (Sum of parallel threads: ${totalAvatarColdMs.toFixed(2)} ms)`);
  console.log(`  - SVG Data Injection:               ${coldTimings['svg_data_injection']?.toFixed(2)} ms`);
  console.log(`  - Resvg Rasterization:              ${coldTimings['resvg_rasterization']?.toFixed(2)} ms`);
  console.log(`  - Rendered PNG Size:                ${(coldPng.length / 1024).toFixed(1)} KB`);

  // --- 3. WARM CACHE BENCHMARK (Avatars Cached in Memory, Simulating 30 Real API Calls) ---
  console.log('\n--- 3. WARM CACHE BENCHMARK (30 Iterations with LRU-Cached Avatars) ---');
  const iters = 30;
  const latencies: number[] = [];
  const resvgTimes: number[] = [];
  const avatarTimes: number[] = [];
  const svgInjectTimes: number[] = [];

  for (let i = 0; i < iters; i++) {
    // Dynamic request with varying requester and varying study minutes
    const warmPayload = {
      ...coldPayload,
      requestId: `discord-cdn-warm-${i + 1}`,
      requestContext: { requesterUserId: `user-00${(i % 11) + 1}` },
      leaderboard: {
        ...coldPayload.leaderboard,
        entries: coldPayload.leaderboard.entries.map((e, idx) => ({
          ...e,
          durationMinutes: e.durationMinutes + (i * 10),
        })),
      },
    };

    const { context: warmContext, timings: warmTimings } = createContextWithTiming('study-leaderboard-2');
    const t0 = performance.now();
    const validated = voiceLeaderboardModule.validate(warmPayload);
    await renderVoiceLeaderboard(validated, warmContext);
    const elapsed = performance.now() - t0;

    latencies.push(elapsed);
    if (warmTimings['resvg_rasterization']) resvgTimes.push(warmTimings['resvg_rasterization']);
    if (warmTimings['svg_data_injection']) svgInjectTimes.push(warmTimings['svg_data_injection']);

    let avTime = 0;
    for (let r = 1; r <= 11; r++) {
      avTime += warmTimings[`avatar_fetch_${r}`] || 0;
    }
    avatarTimes.push(avTime);
  }

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / iters;
  const p50 = latencies[Math.floor(iters * 0.50)];
  const p95 = latencies[Math.floor(iters * 0.95)];
  const p99 = latencies[Math.floor(iters * 0.99)];
  const min = latencies[0];
  const max = latencies[latencies.length - 1];

  const avgResvg = resvgTimes.reduce((a, b) => a + b, 0) / resvgTimes.length;
  const avgAvatar = avatarTimes.reduce((a, b) => a + b, 0) / avatarTimes.length;
  const avgInject = svgInjectTimes.reduce((a, b) => a + b, 0) / svgInjectTimes.length;

  console.log(`================================================================================`);
  console.log(`  DISCORD CDN LEADERBOARD EMPIRICAL BENCHMARK RESULTS`);
  console.log(`================================================================================`);
  console.log(`• Number of Unique Discord Avatars:  11 (all fetched from cdn.discordapp.com)`);
  console.log(`• Cold Request (1st fetch over WAN): ${totalColdMs.toFixed(2)} ms (Network + Decode + Render)`);
  console.log(`• Warm In-Memory Latency (Average):  ${avg.toFixed(2)} ms`);
  console.log(`• Median (P50):                      ${p50.toFixed(2)} ms`);
  console.log(`• P95 Latency:                       ${p95.toFixed(2)} ms`);
  console.log(`• P99 Latency:                       ${p99.toFixed(2)} ms`);
  console.log(`• Min / Max:                         ${min.toFixed(2)} ms / ${max.toFixed(2)} ms`);
  console.log(`• Throughput (Warm):                 ${(1000 / avg).toFixed(1)} renders/sec`);
  console.log(`• Sub-stage Breakdown (Warm Average):`);
  console.log(`    - 11 Avatar Retrieval (LRU):     ${avgAvatar.toFixed(2)} ms`);
  console.log(`    - Dynamic SVG Data Injection:    ${avgInject.toFixed(2)} ms`);
  console.log(`    - Resvg Rasterization:           ${avgResvg.toFixed(2)} ms`);
  console.log(`================================================================================`);
}

if (process.argv[1]?.includes('benchmark-discord-cdn-leaderboard')) {
  runBenchmark().catch(console.error);
}
