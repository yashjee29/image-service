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

  it('operates at base concurrency (1 core) under normal serial load', async () => {
    // Default queue uses base: 1, burst: 2, threshold: 1
    const queue = new RenderQueue({ baseConcurrent: 1, burstConcurrent: 2, burstThreshold: 1 });
    let maxObservedActive = 0;
    let active = 0;

    const runSerial = async () => {
      active++;
      maxObservedActive = Math.max(maxObservedActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
      return 'ok';
    };

    await queue.run(runSerial);
    await queue.run(runSerial);

    expect(maxObservedActive).toBe(1);
    expect(queue.getStats().effectiveMaxConcurrent).toBe(1);
    expect(queue.getStats().isBursting).toBe(false);
  });

  it('bursts to 2 cores when requests queue up and drops back to 1 core when drained', async () => {
    const queue = new RenderQueue({ baseConcurrent: 1, burstConcurrent: 2, burstThreshold: 1 });
    let maxObservedActive = 0;
    let active = 0;

    const makeTask = (ms: number) => async () => {
      active++;
      maxObservedActive = Math.max(maxObservedActive, active);
      await new Promise((r) => setTimeout(r, ms));
      active--;
      return 'done';
    };

    // Dispatch 4 simultaneous tasks
    const p1 = queue.run(makeTask(40));
    const p2 = queue.run(makeTask(40));
    const p3 = queue.run(makeTask(40));
    const p4 = queue.run(makeTask(40));

    const results = await Promise.all([p1, p2, p3, p4]);

    expect(results).toEqual(['done', 'done', 'done', 'done']);
    // Verified: Exactly 2 cores were used during burst, not 3 or 4
    expect(maxObservedActive).toBe(2);
    // Verified: Dropped back to 1 core after draining
    expect(queue.getStats().activeCount).toBe(0);
    expect(queue.getStats().queuedCount).toBe(0);
    expect(queue.getStats().effectiveMaxConcurrent).toBe(1);
    expect(queue.getStats().isBursting).toBe(false);
  });
});
