import { describe, it, expect } from 'vitest';
import { FontRegistry } from '../../src/core/fonts/font-registry.js';

describe('FontRegistry', () => {
  it('handles empty or non-existent font directory without throwing', () => {
    const registry = new FontRegistry('./non-existent-font-dir');
    registry.initialize();

    expect(registry.isInitialized()).toBe(true);
    expect(registry.getFontFiles()).toEqual([]);
    expect(registry.getDefaultFontFamily()).toBe('Poppins');

    const summary = registry.getSummary();
    expect(summary.count).toBe(0);
    expect(summary.loadSystemFonts).toBe(false);
  });
});
