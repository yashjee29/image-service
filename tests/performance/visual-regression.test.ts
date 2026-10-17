import { describe, it, expect } from 'vitest';
import { runComparison } from '../../scripts/compare-images.js';

describe('Visual Regression & Mathematical Fidelity', () => {
  it('demonstrates high mathematical fidelity between raw dynamic and baked shadow templates', async () => {
    const comparison = await runComparison();

    expect(comparison.totalPixels).toBe(1002000);
    // Differing pixels must be 0% with pixelmatch
    expect(comparison.differingPixels).toBe(0);
    expect(comparison.diffPercentage).toBeLessThan(0.001);
    // PSNR must be > 90 dB (or Infinity)
    expect(comparison.psnr).toBeGreaterThan(90);
  });
});
