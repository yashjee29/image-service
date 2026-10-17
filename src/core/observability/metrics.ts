import { renderCache } from '../cache/render-cache.js';
import { renderQueue } from '../concurrency/render-queue.js';

export interface LatencyPercentiles {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export class MetricsCollector {
  private totalRequests = 0;
  private successfulRenders = 0;
  private failedRenders = 0;
  private cachedRenders = 0;
  private readonly latencies: number[] = [];
  private readonly maxLatencyHistory = 1000;
  private readonly moduleCounts = new Map<string, number>();

  public recordRender(params: {
    durationMs: number;
    success: boolean;
    cached: boolean;
    moduleId: string;
  }): void {
    this.totalRequests++;
    if (params.success) {
      this.successfulRenders++;
    } else {
      this.failedRenders++;
    }

    if (params.cached) {
      this.cachedRenders++;
    }

    const currentCount = this.moduleCounts.get(params.moduleId) ?? 0;
    this.moduleCounts.set(params.moduleId, currentCount + 1);

    this.latencies.push(params.durationMs);
    if (this.latencies.length > this.maxLatencyHistory) {
      this.latencies.shift();
    }
  }

  public getPercentiles(): LatencyPercentiles {
    if (this.latencies.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = parseFloat((sum / sorted.length).toFixed(2));

    const p = (pct: number): number => {
      const idx = Math.min(
        Math.floor((pct / 100) * sorted.length),
        sorted.length - 1
      );
      return parseFloat((sorted[idx] ?? 0).toFixed(2));
    };

    return {
      min: parseFloat((sorted[0] ?? 0).toFixed(2)),
      max: parseFloat((sorted[sorted.length - 1] ?? 0).toFixed(2)),
      avg,
      p50: p(50),
      p95: p(95),
      p99: p(99),
    };
  }

  public getSnapshot() {
    const memory = process.memoryUsage();
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      requests: {
        total: this.totalRequests,
        success: this.successfulRenders,
        failed: this.failedRenders,
        cached: this.cachedRenders,
        byModule: Object.fromEntries(this.moduleCounts),
      },
      latencies: this.getPercentiles(),
      queue: renderQueue.getStats(),
      cache: renderCache.getStats(),
      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        externalBytes: memory.external,
      },
    };
  }
}

export const metricsCollector = new MetricsCollector();
