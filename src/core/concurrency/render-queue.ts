import { rendererConfig } from '../../config/renderer.config.js';
import { QueueFullError, RenderTimeoutError } from '../../utils/errors.js';

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  timeoutId?: NodeJS.Timeout;
}

export interface RenderQueueStats {
  activeCount: number;
  queuedCount: number;
  maxConcurrent: number;
  maxQueueSize: number;
  totalProcessed: number;
  totalRejected: number;
}

export class RenderQueue {
  private activeCount = 0;
  private readonly queue: QueueItem<unknown>[] = [];
  private totalProcessed = 0;
  private totalRejected = 0;

  constructor(
    private readonly maxConcurrent: number = rendererConfig.maxConcurrentRenders,
    private readonly maxQueueSize: number = rendererConfig.maxQueueSize,
    private readonly timeoutMs: number = rendererConfig.renderTimeoutMs
  ) {}

  public async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrent) {
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
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
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
    return {
      activeCount: this.activeCount,
      queuedCount: this.queue.length,
      maxConcurrent: this.maxConcurrent,
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
