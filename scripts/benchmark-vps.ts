import os from 'node:os';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { avatarCache } from '../src/core/images/avatar-cache.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { renderVoiceLeaderboard } from '../src/modules/voice-leaderboard/renderer.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';
import { rendererConfig } from '../src/config/renderer.config.js';

// 11 Unique Live Discord CDN Avatars
const VPS_DISCORD_AVATARS = [
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

async function runVpsBenchmark() {
  const cpus = os.cpus();
  const totalRamGb = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeRamGb = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   IMAGE SERVICE - VPS BENCHMARK SUITE                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('--- 1. SYSTEM & VPS ENVIRONMENT SPECIFICATIONS ---');
  console.log(`• Operating System:       ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`• CPU Model:              ${cpus[0]?.model ?? 'Unknown'}`);
  console.log(`• CPU Logical Cores:      ${cpus.length}`);
  console.log(`• System Memory:          ${totalRamGb} GB Total (${freeRamGb} GB Free)`);
  console.log(`• Node.js Engine:         ${process.version} (V8: ${process.versions.v8})`);
  console.log(`• Dynamic Concurrency:    Baseline: ${rendererConfig.baseConcurrentRenders} core | Burst: ${rendererConfig.burstConcurrentRenders} cores (Trigger: ${rendererConfig.burstQueueThreshold} queued)\n`);

  console.log('Initializing font and asset registries...');
  fontRegistry.initialize();
  await rankAssetCache.initialize();
  await leaderboardAssetCache.initialize();
  console.log('✓ Registries initialized.\n');

  // Clear avatar cache to guarantee true Cold Start
  avatarCache.clear();

  // --------------------------------------------------------------------------
  // Phase 1: Cold Start Benchmark (11 Unique Live Discord CDN Avatars)
  // --------------------------------------------------------------------------
  console.log('--- 2. PHASE 1: COLD START BENCHMARK (11 Live Discord CDN Avatars over WAN) ---');
  const coldPayload = {
    schemaVersion: '1.0',
    requestId: 'vps-cold-001',
    requestContext: { requesterUserId: 'user-002' },
    render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1, layout: 'podium_and_list', highlightRequester: true },
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: VPS_DISCORD_AVATARS.map((item, idx) => ({
        position: item.rank,
        userId: `user-00${item.rank}`,
        username: item.name,
        avatarUrl: item.url,
        durationMinutes: 19260 - idx * 1200,
        rank: {
          id: idx === 0 ? 'immortal' : (idx === 1 ? 'ascendant' : (idx < 5 ? 'diamond' : 'gold')),
          name: idx === 0 ? 'Immortal' : (idx === 1 ? 'Ascendant' : (idx < 5 ? 'Diamond' : 'Gold')),
        },
      })),
    },
  };

  const { context: coldContext, timings: coldTimings } = createContextWithTiming('study-leaderboard-2');
  const coldT0 = performance.now();
  const validatedCold = voiceLeaderboardModule.validate(coldPayload);
  const coldValidationMs = performance.now() - coldT0;

  const coldPng = await renderVoiceLeaderboard(validatedCold, coldContext);
  const totalColdMs = performance.now() - coldT0;

  let totalAvatarColdMs = 0;
  for (let r = 1; r <= 11; r++) {
    totalAvatarColdMs += coldTimings[`avatar_fetch_${r}`] || 0;
  }
  const parallelAvatarTime = (coldTimings['avatar_fetch_1'] !== undefined)
    ? Math.max(...Array.from({ length: 11 }, (_, i) => coldTimings[`avatar_fetch_${i + 1}`] || 0))
    : 0;

  console.log(`• Total Cold Response Latency:        ${totalColdMs.toFixed(2)} ms`);
  console.log(`  ├─ Zod Schema Validation:           ${coldValidationMs.toFixed(2)} ms`);
  console.log(`  ├─ 11 Discord CDN Parallel Fetch:   ${parallelAvatarTime.toFixed(2)} ms (Sum of individual threads: ${totalAvatarColdMs.toFixed(2)} ms)`);
  console.log(`  ├─ Dynamic SVG Data & Text Fit:     ${coldTimings['svg_data_injection']?.toFixed(2)} ms`);
  console.log(`  └─ Resvg Rust Rasterization:        ${coldTimings['resvg_rasterization']?.toFixed(2)} ms`);
  console.log(`• Rendered PNG Output Size:           ${(coldPng.length / 1024).toFixed(1)} KB\n`);

  // --------------------------------------------------------------------------
  // Phase 2: Warm In-Memory Steady State (30 Iterations)
  // --------------------------------------------------------------------------
  console.log('--- 3. PHASE 2: WARM IN-MEMORY BENCHMARK (30 Dynamic Queries, Avatars Cached) ---');
  const iters = 30;
  const latencies: number[] = [];
  const resvgTimes: number[] = [];
  const avatarTimes: number[] = [];
  const svgTimes: number[] = [];

  for (let i = 0; i < iters; i++) {
    const warmPayload = {
      ...coldPayload,
      requestId: `vps-warm-${i + 1}`,
      requestContext: { requesterUserId: `user-00${(i % 11) + 1}` },
      leaderboard: {
        ...coldPayload.leaderboard,
        entries: coldPayload.leaderboard.entries.map((e, idx) => ({
          ...e,
          durationMinutes: e.durationMinutes + (i * 15),
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
    if (warmTimings['svg_data_injection']) svgTimes.push(warmTimings['svg_data_injection']);

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
  const avgSvg = svgTimes.reduce((a, b) => a + b, 0) / svgTimes.length;

  console.log(`• Average Response Latency:           ${avg.toFixed(2)} ms`);
  console.log(`• Median Latency (P50):               ${p50.toFixed(2)} ms`);
  console.log(`• 95th Percentile (P95):              ${p95.toFixed(2)} ms`);
  console.log(`• 99th Percentile (P99):              ${p99.toFixed(2)} ms`);
  console.log(`• Min / Max Latency:                  ${min.toFixed(2)} ms / ${max.toFixed(2)} ms`);
  console.log(`• Single-Core Throughput:             ${(1000 / avg).toFixed(1)} renders/sec`);
  console.log(`• Sub-stage Breakdown:`);
  console.log(`  ├─ 11 Avatar LRU Cache Lookup:      ${avgAvatar.toFixed(2)} ms`);
  console.log(`  ├─ Dynamic SVG Replacements:        ${avgSvg.toFixed(2)} ms`);
  console.log(`  └─ Resvg Rust Rasterization:        ${avgResvg.toFixed(2)} ms\n`);

  // --------------------------------------------------------------------------
  // Phase 3: High-Concurrency Burst Load (10 Simultaneous Users)
  // --------------------------------------------------------------------------
  console.log('--- 4. PHASE 3: CONCURRENCY BURST BENCHMARK (10 Simultaneous User Requests) ---');
  const burstStart = performance.now();
  const burstPromises = [];

  for (let i = 0; i < 10; i++) {
    const c = createRenderContext('study-leaderboard-2');
    const p = voiceLeaderboardModule.validate({
      ...coldPayload,
      requestId: `vps-burst-${i + 1}`,
      requestContext: { requesterUserId: `user-00${(i % 11) + 1}` },
      leaderboard: {
        ...coldPayload.leaderboard,
        entries: coldPayload.leaderboard.entries.map((e, idx) => ({
          ...e,
          durationMinutes: e.durationMinutes + (i * 20),
        })),
      },
    });
    const taskT0 = performance.now();
    burstPromises.push(renderVoiceLeaderboard(p, c).then(() => performance.now() - taskT0));
  }

  const burstLatencies = await Promise.all(burstPromises);
  const totalBurstBatchMs = performance.now() - burstStart;
  burstLatencies.sort((a, b) => a - b);

  console.log(`• Total Batch Time for 10 Users:      ${totalBurstBatchMs.toFixed(2)} ms`);
  console.log(`• Concurrent Multi-Core Throughput:   ${((10 / totalBurstBatchMs) * 1000).toFixed(1)} renders/sec`);
  console.log(`• Average Latency per User:           ${(burstLatencies.reduce((a, b) => a + b, 0) / 10).toFixed(2)} ms`);
  console.log(`• Concurrent P50 / P95:               ${burstLatencies[Math.floor(10 * 0.50)].toFixed(2)} ms / ${burstLatencies[Math.floor(10 * 0.95)].toFixed(2)} ms\n`);

  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log('  VPS BENCHMARK COMPLETE - ALL PHASES PASSED SUCCESSFULLY');
  console.log('══════════════════════════════════════════════════════════════════════════════');
}

runVpsBenchmark().catch(console.error);
