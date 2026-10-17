import { sha256 } from '../../utils/buffer-utils.js';
import type { RenderOptions } from '../renderer/renderer.types.js';

export function normalizeInputForCache(input: unknown): string {
  if (input === null || typeof input !== 'object') {
    return JSON.stringify(input);
  }

  // Deterministically sort object keys
  const sortKeys = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const val = obj[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        sorted[key] = sortKeys(val as Record<string, unknown>);
      } else {
        sorted[key] = val;
      }
    }
    return sorted;
  };

  return JSON.stringify(sortKeys(input as Record<string, unknown>));
}

export function generateCacheKey(params: {
  moduleId: string;
  moduleVersion: string;
  templateVersion: string;
  input: unknown;
  options?: RenderOptions;
}): string {
  const normalizedInput = normalizeInputForCache(params.input);
  const normalizedOptions = JSON.stringify(params.options ?? {});
  const rawKey = `${params.moduleId}:${params.moduleVersion}:${params.templateVersion}:${normalizedInput}:${normalizedOptions}`;
  return sha256(rawKey);
}
