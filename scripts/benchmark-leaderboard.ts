process.env.NODE_ENV = 'test';

import { buildApp } from '../src/app.js';
import { renderCache } from '../src/core/cache/render-cache.js';
import { formatBytes } from '../src/utils/buffer-utils.js';
import {
  printProcessHeader,
  logWithPid,
  printPeakResourceUsage,
} from '../src/utils/processMetrics.js';

interface LeaderboardBenchmarkStats {
  mode: string;
  totalRequests: number;
  wallClockMs: number;
  throughput: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  totalOutputBytes: number;
  cacheHits: number;
  cacheMisses: number;
}

function calculatePercentiles(latencies: number[]): {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
} {
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;

  const p = (pct: number) => {
    const idx = Math.min(Math.floor((pct / 100) * sorted.length), sorted.length - 1);
    return sorted[idx] ?? 0;
  };

  return {
    avg,
    p50: p(50),
    p95: p(95),
    p99: p(99),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

export async function runLeaderboardBenchmark(options: {
  iterations?: number;
  scale?: number;
  enableWarmCache?: boolean;
}): Promise<LeaderboardBenchmarkStats> {
  const { iterations = 50, scale = 1, enableWarmCache = false } = options;

  const app = await buildApp({ logger: false, rateLimit: false });
  renderCache.clear();

  const basePayload = {
    schemaVersion: '1.0',
    render: {
      templateId: 'study-leaderboard-v1',
      format: 'png',
      scale,
    },
    filters: {
      period: 'monthly',
      metric: 'cam',
    },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: [
        { position: 1, username: 'Aarav', durationMinutes: 19260, rank: { id: 'immortal', name: 'Immortal' } },
        { position: 2, username: 'Sakha', durationMinutes: 17040, rank: { id: 'ascendant', name: 'Ascendant' } },
        { position: 3, username: 'Mira', durationMinutes: 15060, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 4, username: 'PixelDreams', durationMinutes: 13680, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 5, username: 'Kabir', durationMinutes: 12420, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 6, username: 'Anaya', durationMinutes: 11580, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 7, username: 'Dev', durationMinutes: 10560, rank: { id: 'gold', name: 'Gold' } },
        { position: 8, username: 'Isha', durationMinutes: 9840, rank: { id: 'gold', name: 'Gold' } },
        { position: 9, username: 'Neel', durationMinutes: 8940, rank: { id: 'silver', name: 'Silver' } },
        { position: 10, username: 'Tara', durationMinutes: 7920, rank: { id: 'silver', name: 'Silver' } },
        { position: 11, username: 'HexCode', durationMinutes: 7260, rank: { id: 'bronze', name: 'Bronze' } },
      ],
    },
  };

  // Warmup render
  await app.inject({
    method: 'POST',
    url: '/api/v1/render/voice-leaderboard',
    payload: basePayload,
  });

  if (!enableWarmCache) {
    renderCache.clear();
  }

  const latencies: number[] = [];
  let totalOutputBytes = 0;
  let cacheHits = 0;
  let cacheMisses = 0;

  const startWallClock = performance.now();

  for (let i = 0; i < iterations; i++) {
    const payload = enableWarmCache
      ? basePayload
      : {
          ...basePayload,
          leaderboard: {
            ...basePayload.leaderboard,
            entries: basePayload.leaderboard.entries.map((e, idx) => ({
              ...e,
              username: idx === 0 ? `User_${i}` : e.username,
            })),
          },
        };

    const start = performance.now();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/render/voice-leaderboard',
      payload,
    });
    const duration = performance.now() - start;
    latencies.push(duration);

    if (res.statusCode === 200) {
      totalOutputBytes += res.rawPayload.length;
      if (res.headers['x-cache'] === 'HIT') {
        cacheHits++;
      } else {
        cacheMisses++;
      }
    }
  }

  const totalWallClockMs = performance.now() - startWallClock;
  const percentiles = calculatePercentiles(latencies);
  const throughput = (iterations / totalWallClockMs) * 1000;
  const mode = `Scale ${scale} (${enableWarmCache ? 'WARM CACHE' : 'COLD CACHE'})`;

  logWithPid('================================================================================');
  logWithPid(`   STUDY LEADERBOARD BENCHMARK: ${mode}`);
  logWithPid('================================================================================');
  logWithPid(`Total Requests:          ${iterations}`);
  logWithPid(`Total Wall-Clock Time:   ${totalWallClockMs.toFixed(2)} ms (${(totalWallClockMs / 1000).toFixed(2)}s)`);
  logWithPid(`Throughput:               ${throughput.toFixed(2)} img/s`);
  logWithPid(`Average Latency:          ${percentiles.avg.toFixed(2)} ms`);
  logWithPid(`Median Latency (P50):     ${percentiles.p50.toFixed(2)} ms`);
  logWithPid(`P95 Latency:              ${percentiles.p95.toFixed(2)} ms`);
  logWithPid(`P99 Latency:              ${percentiles.p99.toFixed(2)} ms`);
  logWithPid(`Min / Max Latency:        ${percentiles.min.toFixed(2)} / ${percentiles.max.toFixed(2)} ms`);
  logWithPid(`Average Output Size:      ${formatBytes(Math.round(totalOutputBytes / iterations))}`);
  logWithPid(`Total Output Transferred: ${formatBytes(totalOutputBytes)}`);
  logWithPid(`Cache Hits / Misses:      ${cacheHits} / ${cacheMisses}`);
  logWithPid('================================================================================\n');

  await app.close();

  return {
    mode,
    totalRequests: iterations,
    wallClockMs: totalWallClockMs,
    throughput,
    avgLatencyMs: percentiles.avg,
    p50Ms: percentiles.p50,
    p95Ms: percentiles.p95,
    p99Ms: percentiles.p99,
    minMs: percentiles.min,
    maxMs: percentiles.max,
    totalOutputBytes,
    cacheHits,
    cacheMisses,
  };
}

async function main() {
  printProcessHeader('Study Leaderboard Performance Benchmark (Scale 1 vs Scale 2)');

  console.log('\n>>> Test 1: Scale 1 (Fast Production Mode, 1536x1024, 2x Internal Icon Quality) - Cold Cache');
  const scale1Cold = await runLeaderboardBenchmark({ iterations: 30, scale: 1, enableWarmCache: false });

  console.log('\n>>> Test 2: Scale 1 (Fast Production Mode, 1536x1024, 2x Internal Icon Quality) - Warm Cache');
  const scale1Warm = await runLeaderboardBenchmark({ iterations: 30, scale: 1, enableWarmCache: true });

  console.log('\n>>> Test 3: Scale 2 (Heavy Retina Mode, 3072x2048) - Cold Cache');
  const scale2Cold = await runLeaderboardBenchmark({ iterations: 15, scale: 2, enableWarmCache: false });

  const speedup = scale2Cold.avgLatencyMs / scale1Cold.avgLatencyMs;
  const savings = ((1 - scale1Cold.avgLatencyMs / scale2Cold.avgLatencyMs) * 100).toFixed(1);

  console.log('\n================================================================================');
  console.log('BENCHMARK SUMMARY & PERFORMANCE COMPARISON');
  console.log('================================================================================');
  console.log(`• Scale 1 Cold Average Latency: ${scale1Cold.avgLatencyMs.toFixed(2)} ms (${scale1Cold.throughput.toFixed(1)} req/s)`);
  console.log(`• Scale 1 Warm Average Latency: ${scale1Warm.avgLatencyMs.toFixed(2)} ms (${scale1Warm.throughput.toFixed(1)} req/s)`);
  console.log(`• Scale 2 Cold Average Latency: ${scale2Cold.avgLatencyMs.toFixed(2)} ms (${scale2Cold.throughput.toFixed(1)} req/s)`);
  console.log(`• Speedup (Scale 1 vs Scale 2):  ${speedup.toFixed(2)}x FASTER (${savings}% latency reduction)`);
  console.log(`• Conclusion: Scale 1 delivers ultra-fast responses (~${scale1Cold.avgLatencyMs.toFixed(0)}ms cold, ~${scale1Warm.avgLatencyMs.toFixed(0)}ms warm) with 2x crisp icons.`);
  console.log('================================================================================\n');
}

if (process.argv[1] === import.meta.filename) {
  main().catch((err) => {
    console.error('Leaderboard benchmark failed:', err);
    process.exit(1);
  });
}
