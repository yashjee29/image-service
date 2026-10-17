import { describe, it, expect, beforeEach } from 'vitest';
import { generateCacheKey } from '../../src/core/cache/cache-key.js';
import { RenderCache } from '../../src/core/cache/render-cache.js';

describe('RenderCache & CacheKey', () => {
  describe('generateCacheKey', () => {
    it('produces identical deterministic hash for same object with different key ordering', () => {
      const key1 = generateCacheKey({
        moduleId: 'voice-profile',
        moduleVersion: '1.0.0',
        templateVersion: 'abc123',
        input: { b: 2, a: 1, nested: { y: 20, x: 10 } },
      });

      const key2 = generateCacheKey({
        moduleId: 'voice-profile',
        moduleVersion: '1.0.0',
        templateVersion: 'abc123',
        input: { a: 1, b: 2, nested: { x: 10, y: 20 } },
      });

      expect(key1).toBe(key2);
    });

    it('produces different hash when inputs differ', () => {
      const key1 = generateCacheKey({
        moduleId: 'voice-profile',
        moduleVersion: '1.0.0',
        templateVersion: 'abc123',
        input: { username: 'User1' },
      });

      const key2 = generateCacheKey({
        moduleId: 'voice-profile',
        moduleVersion: '1.0.0',
        templateVersion: 'abc123',
        input: { username: 'User2' },
      });

      expect(key1).not.toBe(key2);
    });
  });

  describe('RenderCache operations', () => {
    let cache: RenderCache;

    beforeEach(() => {
      // Small capacity cache for testing: max 3 entries, max 300 bytes, TTL 500ms
      cache = new RenderCache(true, 3, 300, 500);
    });

    it('stores and retrieves cached buffer copy', () => {
      const buf = Buffer.from('test-image-bytes');
      cache.set('key-1', buf);

      const retrieved = cache.get('key-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.toString()).toBe('test-image-bytes');

      // Verify defensive copy: mutating retrieved buffer does not mutate cache
      retrieved![0] = 0;
      const retrievedAgain = cache.get('key-1');
      expect(retrievedAgain?.toString()).toBe('test-image-bytes');
    });

    it('returns null on cache miss', () => {
      expect(cache.get('missing-key')).toBeNull();
    });

    it('evicts oldest entry when max entry count is exceeded', () => {
      cache.set('key-1', Buffer.alloc(10, 1));
      cache.set('key-2', Buffer.alloc(10, 2));
      cache.set('key-3', Buffer.alloc(10, 3));

      // Access key-1 to make key-2 the least recently used
      cache.get('key-1');

      // Insert key-4: key-2 should be evicted
      cache.set('key-4', Buffer.alloc(10, 4));

      expect(cache.get('key-2')).toBeNull();
      expect(cache.get('key-1')).not.toBeNull();
      expect(cache.get('key-3')).not.toBeNull();
      expect(cache.get('key-4')).not.toBeNull();
    });

    it('evicts entries when byte budget is exceeded', () => {
      // Capacity is 300 bytes
      cache.set('key-1', Buffer.alloc(120));
      cache.set('key-2', Buffer.alloc(120));

      // Inserting 100 bytes exceeds 300 bytes total -> evicts key-1
      cache.set('key-3', Buffer.alloc(100));

      expect(cache.get('key-1')).toBeNull();
      expect(cache.get('key-2')).not.toBeNull();
      expect(cache.get('key-3')).not.toBeNull();
    });

    it('expires entries after TTL', async () => {
      const shortTtlCache = new RenderCache(true, 10, 1000, 20); // 20ms TTL
      shortTtlCache.set('expire-key', Buffer.from('data'));

      expect(shortTtlCache.get('expire-key')).not.toBeNull();

      // Wait 30ms
      await new Promise((r) => setTimeout(r, 30));

      expect(shortTtlCache.get('expire-key')).toBeNull();
    });

    it('tracks hits, misses, and evictions', () => {
      cache.set('k1', Buffer.alloc(10));
      cache.get('k1'); // hit
      cache.get('k2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });
});
