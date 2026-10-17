import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleRegistry } from '../../src/modules/registry.js';
import type { ImageModule } from '../../src/core/renderer/renderer.types.js';
import { ModuleNotFoundError, ValidationError } from '../../src/utils/errors.js';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  const mockModule: ImageModule<{ text: string }> = {
    id: 'mock-module',
    version: '1.0.0',
    description: 'Mock module for testing',
    defaultDimensions: { width: 500, height: 300 },
    validate: (input: unknown) => {
      if (typeof input !== 'object' || input === null || !('text' in input)) {
        throw new ValidationError('text is required');
      }
      return input as { text: string };
    },
    render: async (input) => Buffer.from(input.text),
  };

  beforeEach(() => {
    registry = new ModuleRegistry();
  });

  it('registers a module and allows typed retrieval', () => {
    registry.register(mockModule);
    expect(registry.has('mock-module')).toBe(true);

    const retrieved = registry.get<{ text: string }>('mock-module');
    expect(retrieved.id).toBe('mock-module');
    expect(retrieved.version).toBe('1.0.0');
  });

  it('rejects duplicate module registration with ValidationError', () => {
    registry.register(mockModule);
    expect(() => registry.register(mockModule)).toThrow(ValidationError);
  });

  it('throws ModuleNotFoundError when requesting an unknown module', () => {
    expect(() => registry.get('non-existent')).toThrow(ModuleNotFoundError);
  });

  it('rejects modules with invalid ID or version', () => {
    // @ts-expect-error invalid module
    expect(() => registry.register({ ...mockModule, id: '' })).toThrow(ValidationError);
    // @ts-expect-error invalid module
    expect(() => registry.register({ ...mockModule, version: '' })).toThrow(ValidationError);
  });

  it('returns metadata list for all registered modules', () => {
    registry.register(mockModule);
    const meta = registry.getMetadataList();
    expect(meta).toHaveLength(1);
    expect(meta[0]?.id).toBe('mock-module');
    expect(meta[0]?.defaultDimensions).toEqual({ width: 500, height: 300 });
  });
});
