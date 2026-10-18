import sharp from 'sharp';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { SvgRenderer } from '../src/core/renderer/svg-renderer.js';

const ARTIFACT_DIR = '/Users/yashjee/.gemini/antigravity/brain/558b160c-a309-418a-849c-7b34546f9026';

async function testComparison() {
  fontRegistry.initialize();

  const ranks = ['immortal', 'ascendant', 'diamond', 'platinum', 'gold', 'silver', 'bronze'];

  // Pre-render rank assets at 80px (exact 2x for pills) using clean Lanczos3 (NO sharpen)
  const rank80Uris: Record<string, string> = {};
  const rank120Uris: Record<string, string> = {};

  for (const r of ranks) {
    const raw = fs.readFileSync(`assets/profile/ranks/${r}.png`);
    
    // 80px (clean 2x for 36-40px pills)
    const b80 = await sharp(raw)
      .resize(80, 80, { fit: 'contain', kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 8 })
      .toBuffer();
    rank80Uris[r] = `data:image/png;base64,${b80.toString('base64')}`;

    // 120px (clean 2x for 60px profile header)
    const b120 = await sharp(raw)
      .resize(120, 120, { fit: 'contain', kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 8 })
      .toBuffer();
    rank120Uris[r] = `data:image/png;base64,${b120.toString('base64')}`;
  }

  // 1. Leaderboard Style Pills (36x36 in 42px pill)
  const lbSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="520" viewBox="0 0 500 520">
    <rect width="500" height="520" fill="#fbf5f0" />
    <text x="20" y="32" font-family="Nunito Sans, Arial" font-size="16" font-weight="bold">Leaderboard Pills (36px in 1x canvas, 2x 80px injected):</text>
    ${ranks.map((r, i) => `
      <g transform="translate(30, ${50 + i * 64})">
        <rect width="180" height="42" rx="21" fill="#fffaf4" stroke="#eee2d9" stroke-width="1" />
        <image href="${rank80Uris[r]}" x="12" y="3" width="36" height="36" preserveAspectRatio="xMidYMid meet" />
        <text x="58" y="27" font-family="Nunito Sans, Arial" font-size="16" font-weight="600" fill="#333">${r.toUpperCase()}</text>
      </g>
    `).join('')}
  </svg>`;

  // 2. Profile Style Header Badge (60x60 in 1x canvas, 2x 120px injected)
  const profileHeaderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="520" viewBox="0 0 500 520">
    <rect width="500" height="520" fill="#ffffff" />
    <text x="20" y="32" font-family="Nunito Sans, Arial" font-size="16" font-weight="bold">Profile Header Badges (60px in 1x canvas, 2x 120px injected):</text>
    ${ranks.map((r, i) => `
      <g transform="translate(30, ${50 + i * 64})">
        <text x="0" y="40" font-family="Nunito Sans, Arial" font-size="22" font-weight="bold" fill="#15191f">User Name</text>
        <image href="${rank120Uris[r]}" x="140" y="8" width="60" height="60" preserveAspectRatio="xMidYMid meet" />
        <text x="215" y="44" font-family="Nunito Sans, Arial" font-size="18" font-weight="bold" fill="#0E1726">${r.toUpperCase()}</text>
      </g>
    `).join('')}
  </svg>`;

  // 3. Profile Style Progression Badge (40x40 in 1x canvas, 2x 80px injected)
  const profileProgressionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="520" viewBox="0 0 500 520">
    <rect width="500" height="520" fill="#ffffff" />
    <text x="20" y="32" font-family="Nunito Sans, Arial" font-size="16" font-weight="bold">Profile Progression (40px in 1x canvas, 2x 80px injected):</text>
    ${ranks.map((r, i) => `
      <g transform="translate(30, ${50 + i * 64})">
        <image href="${rank80Uris[r]}" x="10" y="10" width="40" height="40" preserveAspectRatio="xMidYMid meet" />
        <text x="60" y="36" font-family="Nunito Sans, Arial" font-size="15" font-weight="600" fill="#0E1726">${r.toUpperCase()}</text>
      </g>
    `).join('')}
  </svg>`;

  const pngLB = SvgRenderer.renderToPng({ svgContent: lbSvg, width: 500 });
  const pngProfileHeader = SvgRenderer.renderToPng({ svgContent: profileHeaderSvg, width: 500 });
  const pngProfileProg = SvgRenderer.renderToPng({ svgContent: profileProgressionSvg, width: 500 });

  fs.writeFileSync(resolve(ARTIFACT_DIR, 'compare-clean2x-leaderboard-pills.png'), pngLB);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'compare-clean2x-profile-header.png'), pngProfileHeader);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'compare-clean2x-profile-progression.png'), pngProfileProg);

  console.log('Saved all 3 clean 2x comparison sheets to artifact directory.');
}

testComparison().catch(console.error);
