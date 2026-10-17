export interface StageTiming {
  stage: string;
  durationMs: number;
}

export class PerformanceTracker {
  private readonly startTimes = new Map<string, number>();
  private readonly timings = new Map<string, number>();
  private readonly totalStart: number;
  private readonly initialCpu: NodeJS.CpuUsage;

  constructor() {
    this.totalStart = performance.now();
    this.initialCpu = process.cpuUsage();
  }

  public startStage(stage: string): void {
    this.startTimes.set(stage, performance.now());
  }

  public endStage(stage: string): number {
    const start = this.startTimes.get(stage);
    if (start === undefined) return 0;
    const duration = performance.now() - start;
    this.timings.set(stage, duration);
    this.startTimes.delete(stage);
    return duration;
  }

  public async measure<T>(stage: string, fn: () => Promise<T> | T): Promise<T> {
    this.startStage(stage);
    try {
      return await fn();
    } finally {
      this.endStage(stage);
    }
  }

  public getSummary(): {
    totalDurationMs: number;
    cpuUsageUs: NodeJS.CpuUsage;
    stages: Record<string, number>;
  } {
    const totalDurationMs = performance.now() - this.totalStart;
    const cpuUsageUs = process.cpuUsage(this.initialCpu);
    const stages: Record<string, number> = {};

    for (const [stage, duration] of this.timings) {
      stages[stage] = parseFloat(duration.toFixed(3));
    }

    return {
      totalDurationMs: parseFloat(totalDurationMs.toFixed(3)),
      cpuUsageUs,
      stages,
    };
  }
}
