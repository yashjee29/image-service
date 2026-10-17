import { env } from './env.js';

export const cacheConfig = {
  enabled: env.CACHE_ENABLED,
  maxEntries: env.CACHE_MAX_ENTRIES,
  maxBytes: env.CACHE_MAX_BYTES,
  ttlMs: env.CACHE_TTL_MS,
};
