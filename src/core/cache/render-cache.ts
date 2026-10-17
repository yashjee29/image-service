import { cacheConfig } from '../../config/cache.config.js';
import { cloneBuffer } from '../../utils/buffer-utils.js';

interface CacheEntry {
  buffer: Buffer;
  sizeBytes: number;
  expiresAt: number;
}

export interface RenderCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entryCount: number;
  totalSizeBytes: number;
  maxEntries: number;
  maxBytes: number;
}

export class RenderCache {
  private readonly entries = new Map<string, CacheEntry>();
  private totalSizeBytes = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(
    private readonly enabled: boolean = cacheConfig.enabled,
    private readonly maxEntries: number = cacheConfig.maxEntries,
    private readonly maxBytes: number = cacheConfig.maxBytes,
    private readonly ttlMs: number = cacheConfig.ttlMs
  ) {}

  public get(key: string): Buffer | null {
    if (!this.enabled) return null;

    const entry = this.entries.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.remove(key);
      this.misses++;
      return null;
    }

    // Move to most recently used by re-inserting
    this.entries.delete(key);
    this.entries.set(key, entry);

    this.hits++;
    return cloneBuffer(entry.buffer);
  }

  public set(key: string, buffer: Buffer): void {
    if (!this.enabled) return;

    const sizeBytes = buffer.length;
    // Don't cache single items larger than the total cache capacity
    if (sizeBytes > this.maxBytes) {
      return;
    }

    // If key already exists, remove it first
    if (this.entries.has(key)) {
      this.remove(key);
    }

    // Evict oldest until space is available
    while (
      this.entries.size >= this.maxEntries ||
      this.totalSizeBytes + sizeBytes > this.maxBytes
    ) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) break;
      this.remove(oldestKey);
      this.evictions++;
    }

    const entry: CacheEntry = {
      buffer: cloneBuffer(buffer),
      sizeBytes,
      expiresAt: Date.now() + this.ttlMs,
    };

    this.entries.set(key, entry);
    this.totalSizeBytes += sizeBytes;
  }

  public remove(key: string): boolean {
    const entry = this.entries.get(key);
    if (entry) {
      this.totalSizeBytes -= entry.sizeBytes;
      this.entries.delete(key);
      return true;
    }
    return false;
  }

  public clear(): void {
    this.entries.clear();
    this.totalSizeBytes = 0;
  }

  public getStats(): RenderCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      entryCount: this.entries.size,
      totalSizeBytes: this.totalSizeBytes,
      maxEntries: this.maxEntries,
      maxBytes: this.maxBytes,
    };
  }
}

export const renderCache = new RenderCache();
