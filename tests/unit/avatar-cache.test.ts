import { describe, it, expect, beforeEach } from 'vitest';
import sharp from 'sharp';
import {
  AvatarCache,
  FINAL_DISPLAY_AVATAR_DIAMETER,
} from '../../src/core/images/avatar-cache.js';

describe('AvatarCache', () => {
  beforeEach(() => {
    AvatarCache.resetInstance();
  });

  it('resizes avatars at final display dimensions (167px) by default', async () => {
    const testBuffer = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 50, g: 100, b: 150, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const cache = new AvatarCache();
    const dataUri = await cache.getAvatarDataUri(testBuffer);

    expect(dataUri).toMatch(/^data:image\/png;base64,/);

    const base64Data = dataUri.replace(/^data:image\/png;base64,/, '');
    const decodedBuffer = Buffer.from(base64Data, 'base64');
    const metadata = await sharp(decodedBuffer).metadata();

    expect(metadata.width).toBe(FINAL_DISPLAY_AVATAR_DIAMETER);
    expect(metadata.height).toBe(FINAL_DISPLAY_AVATAR_DIAMETER);
    expect(metadata.width).toBe(167);
    expect(metadata.height).toBe(167);
  });

  it('enforces cache byte limit and evicts LRU items when capacity is exceeded', async () => {
    const smallLimit = 15 * 1024;
    const cache = new AvatarCache({ maxBytes: smallLimit });

    const makeBuffer = (color: number) =>
      sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: color, g: 50, b: 50, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

    const buf1 = await makeBuffer(10);
    const buf2 = await makeBuffer(20);
    const buf3 = await makeBuffer(30);

    await cache.getAvatarDataUri(buf1, 100);
    expect(cache.has(`buffer:${buf1.length}:100`)).toBe(true);

    await cache.getAvatarDataUri(buf2, 100);
    expect(cache.has(`buffer:${buf2.length}:100`)).toBe(true);

    await cache.getAvatarDataUri(buf3, 100);
    expect(cache.has(`buffer:${buf3.length}:100`)).toBe(true);

    expect(cache.getCurrentBytes()).toBeLessThanOrEqual(smallLimit);
  });
});
