import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { SvgRenderer } from '../src/core/renderer/svg-renderer.js';
import { templateRegistry } from '../src/core/templates/template-registry.js';
import '../src/modules/voice-leaderboard/index.js';

fontRegistry.initialize();

const template = templateRegistry.get('study-leaderboard-2')!;
let rawSvg = template.content;

// Variant A: Baseline
const iters = 20;

function bench(name: string, svg: string) {
  // Warmup
  SvgRenderer.renderToPng({ svgContent: svg, width: 1536 });
  const start = performance.now();
  for (let i = 0; i < iters; i++) {
    SvgRenderer.renderToPng({ svgContent: svg, width: 1536 });
  }
  const elapsed = performance.now() - start;
  const avg = elapsed / iters;
  console.log(`${name.padEnd(45)}: ${avg.toFixed(2)} ms`);
  return avg;
}

console.log('=== Resvg Rasterization Breakdown ===');
bench('1. Baseline (Full SVG with feDropShadow)', rawSvg);

// Variant B: Remove feDropShadow from the huge 1508x1000 paper rect
const noPaperShadow = rawSvg.replace(
  '<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url(#paper)" stroke="#eadfd7" stroke-width="1" filter="url(#softShadow)"/>',
  '<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url(#paper)" stroke="#eadfd7" stroke-width="1"/>'
);
bench('2. Without Paper Box Shadow', noPaperShadow);

// Variant C: Remove all filters
const noFilters = rawSvg.replace(/filter="url\(#softShadow\)"/g, '');
bench('3. Without Any SVG Filters', noFilters);
