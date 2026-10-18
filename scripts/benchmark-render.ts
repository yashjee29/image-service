process.env.NODE_ENV = 'test';

import { buildApp } from '../src/app.js';
import { renderCache } from '../src/core/cache/render-cache.js';
import { formatBytes } from '../src/utils/buffer-utils.js';
import {
  printProcessHeader,
  logWithPid,
  printPeakResourceUsage,
} from '../src/utils/processMetrics.js';

interface BenchmarkStats {
  totalRequests: number;
  wallClockMs: number;
  throughput: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  cpuTimeMs: number;
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

export async function runBenchmark(options: {
  iterations?: number;
  concurrency?: number;
  enableWarmCache?: boolean;
}): Promise<BenchmarkStats> {
  const { iterations = 100, concurrency = 1, enableWarmCache = false } = options;

  const app = await buildApp({ logger: false, rateLimit: false });
  renderCache.clear();

  const samplePayload = {
    data: {
      username: 'Sakha',
      bio: 'Focus. Compete. Improve.',
      achievements: 24,
      goals: 12,
      milestones: 7,
      leaderboard: {
        rank: '#1',
        percentile: 'Top 1%',
      },
      hoursOverview: {
        monthly: '321h',
        weekly: '78h',
        daily: '08h 11m',
        allTime: '1,937h 50m',
      },
      nextRank: {
        currentRank: 'Diamond',
        currentRange: '(155h to 205h)',
        nextRank: 'Ascendant',
        nextRange: '(205h to 280h)',
        progressPercent: 71,
      },
      timeBreakdown: {
        camHours: '1,128h',
        camPercent: '58%',
        nonCamHours: '809h 50m',
        nonCamPercent: '42%',
        overallHours: '1,937h 50m',
      },
    },
  };

  // Warmup render (1 single render to ensure JIT / modules are loaded)
  await app.inject({
    method: 'POST',
    url: '/api/v1/render/voice-profile',
    payload: samplePayload,
  });

  if (!enableWarmCache) {
    renderCache.clear();
  }

  const latencies: number[] = [];
  let totalOutputBytes = 0;
  let cacheHits = 0;
  let cacheMisses = 0;

  const startCpu = process.cpuUsage();
  const startWallClock = performance.now();

  if (concurrency === 1) {
    for (let i = 0; i < iterations; i++) {
      // Vary payload slightly if cold-cache benchmark to prevent cache reuse
      const payload = enableWarmCache
        ? samplePayload
        : {
            data: {
              ...samplePayload.data,
              username: `User_${i}`,
            },
          };

      const start = performance.now();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
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
      } else {
        console.error(`Request failed with status ${res.statusCode}:`, res.body);
      }
    }
  } else {
    // Concurrent execution in chunks
    const chunks = Math.ceil(iterations / concurrency);
    for (let c = 0; c < chunks; c++) {
      const promises = [];
      const batchSize = Math.min(concurrency, iterations - c * concurrency);

      for (let b = 0; b < batchSize; b++) {
        const i = c * concurrency + b;
        const payload = enableWarmCache
          ? samplePayload
          : {
              data: {
                ...samplePayload.data,
                username: `User_${i}`,
              },
            };

        promises.push(
          (async () => {
            const start = performance.now();
            const res = await app.inject({
              method: 'POST',
              url: '/api/v1/render/voice-profile',
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
          })()
        );
      }
      await Promise.all(promises);
    }
  }

  const totalWallClockMs = performance.now() - startWallClock;
  const cpuUsage = process.cpuUsage(startCpu);
  const totalCpuTimeMs = (cpuUsage.user + cpuUsage.system) / 1000;

  const percentiles = calculatePercentiles(latencies);
  const throughput = (iterations / totalWallClockMs) * 1000;

  const mode = enableWarmCache ? 'WARM-CACHE' : 'COLD-CACHE (NEW INPUT EVERY IMAGE)';
  logWithPid('================================================================================');
  logWithPid(`   ${iterations}-IMAGE WORKLOAD BENCHMARK (${mode}, CONCURRENCY: ${concurrency})`);
  logWithPid('================================================================================');
  logWithPid(`Total Wall-Clock Time:   ${totalWallClockMs.toFixed(2)} ms (${(totalWallClockMs / 1000).toFixed(2)}s)`);
  logWithPid(`Throughput:               ${throughput.toFixed(2)} img/s`);
  logWithPid(`Average Latency:          ${percentiles.avg.toFixed(2)} ms`);
  logWithPid(`Median Latency (P50):     ${percentiles.p50.toFixed(2)} ms`);
  logWithPid(`P95 Latency:              ${percentiles.p95.toFixed(2)} ms`);
  logWithPid(`P99 Latency:              ${percentiles.p99.toFixed(2)} ms`);
  logWithPid(`Min / Max Latency:        ${percentiles.min.toFixed(2)} / ${percentiles.max.toFixed(2)} ms`);
  logWithPid(`Total CPU Time:           ${totalCpuTimeMs.toFixed(2)} ms`);
  logWithPid(`Total PNG Output:         ${formatBytes(totalOutputBytes)} (${(totalOutputBytes / (totalWallClockMs / 1000) / (1024 * 1024)).toFixed(2)} MB/s)`);
  logWithPid(`Cache Hits / Misses:      ${cacheHits} / ${cacheMisses}`);
  const mem = process.memoryUsage();
  logWithPid(`Process RSS Memory:       ${formatBytes(mem.rss)} (Heap: ${formatBytes(mem.heapUsed)})`);
  logWithPid('================================================================================\n');

  await app.close();
  printPeakResourceUsage(`Benchmark (${mode})`);

  return {
    totalRequests: iterations,
    wallClockMs: totalWallClockMs,
    throughput,
    avgLatencyMs: percentiles.avg,
    p50Ms: percentiles.p50,
    p95Ms: percentiles.p95,
    p99Ms: percentiles.p99,
    minMs: percentiles.min,
    maxMs: percentiles.max,
    cpuTimeMs: totalCpuTimeMs,
    totalOutputBytes,
    cacheHits,
    cacheMisses,
  };
}

async function main() {
  console.log('\n--- Running Single Render Test ---');
  await runBenchmark({ iterations: 1, concurrency: 1, enableWarmCache: false });

  console.log('\n--- Running 100-Image Workload (Cold Cache, Single-Threaded) ---');
  await runBenchmark({ iterations: 100, concurrency: 1, enableWarmCache: false });

  console.log('\n--- Running 100-Image Workload (Warm Cache, Single-Threaded) ---');
  await runBenchmark({ iterations: 100, concurrency: 1, enableWarmCache: true });

  console.log('\n--- Running 50-Image Workload (Concurrent: 5 workers) ---');
  await runBenchmark({ iterations: 50, concurrency: 5, enableWarmCache: false });
}

if (process.argv[1] === import.meta.filename) {
  main().catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}
