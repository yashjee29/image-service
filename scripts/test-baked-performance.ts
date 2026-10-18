import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { SvgRenderer } from '../src/core/renderer/svg-renderer.js';
import { templateRegistry } from '../src/core/templates/template-registry.js';
import '../src/modules/voice-leaderboard/index.js';

fontRegistry.initialize();

const template = templateRegistry.get('study-leaderboard-2')!;

// Create a static background by stripping dynamic text, avatars, pills
// And render it once to PNG buffer
const staticSvg = template.content;
const bakedBgBuffer = SvgRenderer.renderToPng({ svgContent: staticSvg, width: 1536 });
const bakedDataUri = `data:image/png;base64,${bakedBgBuffer.toString('base64')}`;

// Now construct a minimalist dynamic SVG that overlays only the dynamic text & avatars on top of the baked background
const dynamicOnlySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" width="1536" height="1024">
  <image href="${bakedDataUri}" x="0" y="0" width="1536" height="1024" />
  <text x="363" y="440" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="33" font-weight="900" fill="#0E1726" text-anchor="middle">Sakha</text>
  <text x="363" y="569" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="47" font-weight="900" fill="#246D5B" text-anchor="middle">284h</text>
</svg>`;

const iters = 20;
// Warmup
SvgRenderer.renderToPng({ svgContent: dynamicOnlySvg, width: 1536 });

const start = performance.now();
for (let i = 0; i < iters; i++) {
  SvgRenderer.renderToPng({ svgContent: dynamicOnlySvg, width: 1536 });
}
const elapsed = performance.now() - start;
console.log(`Dynamic render with Baked Static Background: ${(elapsed / iters).toFixed(2)} ms!`);
