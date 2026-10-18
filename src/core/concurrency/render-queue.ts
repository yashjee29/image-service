import { rendererConfig } from '../../config/renderer.config.js';
import { QueueFullError, RenderTimeoutError } from '../../utils/errors.js';

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  timeoutId?: NodeJS.Timeout;
}

export interface RenderQueueOptions {
  baseConcurrent?: number;
  burstConcurrent?: number;
  burstThreshold?: number;
  maxQueueSize?: number;
  timeoutMs?: number;
}

export interface RenderQueueStats {
  activeCount: number;
  queuedCount: number;
  effectiveMaxConcurrent: number;
  baseConcurrent: number;
  burstConcurrent: number;
  isBursting: boolean;
  maxQueueSize: number;
  totalProcessed: number;
  totalRejected: number;
}

export class RenderQueue {
  private activeCount = 0;
  private readonly queue: QueueItem<unknown>[] = [];
  private totalProcessed = 0;
  private totalRejected = 0;

  private readonly baseConcurrent: number;
  private readonly burstConcurrent: number;
  private readonly burstThreshold: number;
  private readonly maxQueueSize: number;
  private readonly timeoutMs: number;

  constructor(
    optsOrBase?: number | RenderQueueOptions,
    maxQueueSize?: number,
    timeoutMs?: number,
    burstConcurrent?: number,
    burstThreshold?: number
  ) {
    if (typeof optsOrBase === 'object' && optsOrBase !== null) {
      this.baseConcurrent = optsOrBase.baseConcurrent ?? rendererConfig.baseConcurrentRenders;
      this.burstConcurrent = optsOrBase.burstConcurrent ?? rendererConfig.burstConcurrentRenders;
      this.burstThreshold = optsOrBase.burstThreshold ?? rendererConfig.burstQueueThreshold;
      this.maxQueueSize = optsOrBase.maxQueueSize ?? rendererConfig.maxQueueSize;
      this.timeoutMs = optsOrBase.timeoutMs ?? rendererConfig.renderTimeoutMs;
    } else if (typeof optsOrBase === 'number') {
      this.baseConcurrent = optsOrBase;
      this.burstConcurrent = burstConcurrent ?? optsOrBase;
      this.burstThreshold = burstThreshold ?? rendererConfig.burstQueueThreshold;
      this.maxQueueSize = maxQueueSize ?? rendererConfig.maxQueueSize;
      this.timeoutMs = timeoutMs ?? rendererConfig.renderTimeoutMs;
    } else {
      // Default zero-argument instantiation uses dynamic 1-to-2 core autoscaling from config
      this.baseConcurrent = rendererConfig.baseConcurrentRenders;
      this.burstConcurrent = rendererConfig.burstConcurrentRenders;
      this.burstThreshold = rendererConfig.burstQueueThreshold;
      this.maxQueueSize = rendererConfig.maxQueueSize;
      this.timeoutMs = rendererConfig.renderTimeoutMs;
    }
  }

  /**
   * Dynamically determines current allowed concurrency:
   * - Baseline: 1 core (under normal load).
   * - Burst: 2 cores (activated when requests backlog in queue).
   */
  public getEffectiveMaxConcurrent(): number {
    if (this.queue.length >= this.burstThreshold) {
      return this.burstConcurrent;
    }
    return this.baseConcurrent;
  }

  public async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.getEffectiveMaxConcurrent()) {
      return this.executeDirect(task);
    }

    if (this.queue.length >= this.maxQueueSize) {
      this.totalRejected++;
      throw new QueueFullError(
        `Render queue capacity exceeded (${this.queue.length}/${this.maxQueueSize} queued, ${this.activeCount} active)`
      );
    }

    return new Promise<T>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      if (this.timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          const index = this.queue.findIndex((item) => item.resolve === (resolve as unknown));
          if (index !== -1) {
            this.queue.splice(index, 1);
            this.totalRejected++;
            reject(new RenderTimeoutError(`Request timed out waiting in queue after ${this.timeoutMs}ms`));
          }
        }, this.timeoutMs);
      }

      this.queue.push({
        fn: task as () => Promise<unknown>,
        resolve: resolve as (val: unknown) => void,
        reject,
        timeoutId,
      });

      // Check if queued item triggers burst concurrency to process immediately
      this.processNext();
    });
  }

  private async executeDirect<T>(task: () => Promise<T>): Promise<T> {
    this.activeCount++;
    try {
      return await task();
    } finally {
      this.activeCount--;
      this.totalProcessed++;
      this.processNext();
    }
  }

  private processNext(): void {
    if (this.activeCount >= this.getEffectiveMaxConcurrent() || this.queue.length === 0) {
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    if (nextItem.timeoutId) {
      clearTimeout(nextItem.timeoutId);
    }

    this.activeCount++;
    Promise.resolve()
      .then(() => nextItem.fn())
      .then(
        (result) => {
          this.activeCount--;
          this.totalProcessed++;
          nextItem.resolve(result);
          this.processNext();
        },
        (error) => {
          this.activeCount--;
          this.totalProcessed++;
          nextItem.reject(error);
          this.processNext();
        }
      );
  }

  public getStats(): RenderQueueStats {
    const effectiveMax = this.getEffectiveMaxConcurrent();
    return {
      activeCount: this.activeCount,
      queuedCount: this.queue.length,
      effectiveMaxConcurrent: effectiveMax,
      baseConcurrent: this.baseConcurrent,
      burstConcurrent: this.burstConcurrent,
      isBursting: effectiveMax > this.baseConcurrent,
      maxQueueSize: this.maxQueueSize,
      totalProcessed: this.totalProcessed,
      totalRejected: this.totalRejected,
    };
  }

  public clear(): void {
    for (const item of this.queue) {
      if (item.timeoutId) clearTimeout(item.timeoutId);
      item.reject(new Error('Render queue cleared'));
    }
    this.queue.length = 0;
  }
}

export const renderQueue = new RenderQueue();
