import { describe, it, expect } from 'vitest';
import { RenderQueue } from '../../src/core/concurrency/render-queue.js';
import { QueueFullError, RenderTimeoutError } from '../../src/utils/errors.js';

describe('RenderQueue', () => {
  it('executes tasks within maxConcurrent limit', async () => {
    const queue = new RenderQueue(2, 5, 5000);
    let active = 0;
    let maxObservedActive = 0;

    const task = async () => {
      active++;
      maxObservedActive = Math.max(maxObservedActive, active);
      await new Promise((r) => setTimeout(r, 20));
      active--;
      return 'done';
    };

    const results = await Promise.all([
      queue.run(task),
      queue.run(task),
      queue.run(task),
      queue.run(task),
    ]);

    expect(results).toEqual(['done', 'done', 'done', 'done']);
    expect(maxObservedActive).toBeLessThanOrEqual(2);
  });

  it('rejects with QueueFullError when queue capacity is exceeded', async () => {
    // maxConcurrent: 1, maxQueueSize: 2 -> total 3 tasks max in flight
    const queue = new RenderQueue(1, 2, 5000);

    const slowTask = () => new Promise((r) => setTimeout(r, 100));

    // Active
    queue.run(slowTask);
    // Queued 1
    queue.run(slowTask);
    // Queued 2
    queue.run(slowTask);

    // 4th task exceeds queue size 2
    await expect(queue.run(slowTask)).rejects.toThrow(QueueFullError);
  });

  it('rejects with RenderTimeoutError when item waits too long in queue', async () => {
    // Timeout of 25ms
    const queue = new RenderQueue(1, 2, 25);

    // Block active worker for 60ms
    queue.run(() => new Promise((r) => setTimeout(r, 60)));

    // Second task queued, should time out after 25ms
    await expect(queue.run(() => Promise.resolve('ok'))).rejects.toThrow(RenderTimeoutError);
  });
});
