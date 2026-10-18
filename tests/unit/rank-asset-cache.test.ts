import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import {
  RankAssetCache,
  ALL_RANKS,
} from '../../src/core/images/rank-asset-cache.js';

describe('RankAssetCache', () => {
  let cache: RankAssetCache;

  beforeAll(async () => {
    cache = new RankAssetCache();
    await cache.initialize(60);
  });

  it('initializes and caches all standard rank icons', () => {
    expect(cache.isInitialized()).toBe(true);
    const cachedRanks = cache.getAllRanks();

    // At least the ranks available in assets/profile/ranks/ must be loaded
    expect(cachedRanks.length).toBeGreaterThanOrEqual(10);
    for (const rank of ALL_RANKS) {
      expect(cache.has(rank)).toBe(true);
      const uri = cache.getRankDataUri(rank);
      expect(uri).toBeDefined();
      expect(uri).toMatch(/^data:image\/png;base64,/);
    }
  });

  it('resolves rank names case-insensitively with trimming', () => {
    const goldUpper = cache.getRankDataUri('  GOLD  ');
    const goldLower = cache.getRankDataUri('gold');
    expect(goldUpper).toBeDefined();
    expect(goldUpper).toBe(goldLower);
  });

  it('renders pre-sized 60x60 rank icons', async () => {
    const dataUri = cache.getRankDataUri('platinum');
    expect(dataUri).toBeDefined();

    const base64Data = dataUri!.replace(/^data:image\/png;base64,/, '');
    const decodedBuffer = Buffer.from(base64Data, 'base64');
    const metadata = await sharp(decodedBuffer).metadata();

    expect(metadata.width).toBe(60);
    expect(metadata.height).toBe(60);
  });
});
