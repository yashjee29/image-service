import sharp from 'sharp';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { SvgRenderer } from '../src/core/renderer/svg-renderer.js';

const ARTIFACT_DIR = '/Users/yashjee/.gemini/antigravity/brain/558b160c-a309-418a-849c-7b34546f9026';

async function testAllRanks() {
  fontRegistry.initialize();
  const ranks = ['immortal', 'ascendant', 'diamond', 'platinum', 'gold', 'silver', 'bronze'];

  for (const size of [72, 80, 120]) {
    const dataUris: Record<string, string> = {};
    for (const r of ranks) {
      const raw = fs.readFileSync(`assets/profile/ranks/${r}.png`);
      const buf = await sharp(raw)
        .resize(size, size, { fit: 'contain', kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 8 })
        .toBuffer();
      dataUris[r] = `data:image/png;base64,${buf.toString('base64')}`;
    }

    const pillsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
      <rect width="400" height="500" fill="#fbf5f0" />
      <text x="20" y="30" font-family="Nunito Sans, Arial" font-size="16" font-weight="bold">Rank Assets at ${size}px (Clean 2x Supersampled):</text>
      ${ranks
        .map(
          (r, i) => `
        <g transform="translate(30, ${45 + i * 62})">
          <rect width="180" height="42" rx="21" fill="#fffaf4" stroke="#eee2d9" stroke-width="1" />
          <image href="${dataUris[r]}" x="12" y="3" width="36" height="36" preserveAspectRatio="xMidYMid meet" />
          <text x="58" y="27" font-family="Nunito Sans, Arial" font-size="16" font-weight="600" fill="#333">${r.toUpperCase()}</text>
        </g>
      `
        )
        .join('')}
    </svg>`;

    const rendered = SvgRenderer.renderToPng({ svgContent: pillsSvg, width: 400 });
    const outPath = resolve(ARTIFACT_DIR, `test-pills-${size}px.png`);
    fs.writeFileSync(outPath, rendered);
    console.log(`Saved ${outPath}`);
  }
}

testAllRanks().catch(console.error);
