import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');
const RAW_SVG_PATH = resolve(ROOT_DIR, 'templates/voice-profile/profile-raw.svg');
const BAKED_PNG_PATH = resolve(ROOT_DIR, 'assets/profile/card-background-baked.png');
const BAKED_SVG_PATH = resolve(ROOT_DIR, 'templates/voice-profile/profile.svg');

export async function bakeVoiceProfileAssets(): Promise<void> {
  console.log('[bake-assets] Generating static baked shadow container...');

  const staticContainersSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 835" width="1200" height="835">
  <defs>
    <!-- Main Outer Card Drop Shadow -->
    <filter id="card-shadow" x="-3%" y="-3%" width="106%" height="108%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#0B1528" flood-opacity="0.08" />
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0B1528" flood-opacity="0.04" />
    </filter>

    <!-- Subtle Inner Panel Shadow -->
    <filter id="panel-shadow" x="-4%" y="-4%" width="108%" height="112%">
      <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#0F2942" flood-opacity="0.03" />
    </filter>
  </defs>

  <!-- 1. Main Outer Card -->
  <rect x="20" y="30" width="1160" height="772" rx="36" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" filter="url(#card-shadow)" />

  <!-- 2. Summary Counters Panel -->
  <rect x="644" y="62" width="516" height="104" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url(#panel-shadow)" />

  <!-- 3. 7-Day Chart Panel -->
  <rect x="644" y="176" width="516" height="158" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url(#panel-shadow)" />

  <!-- 4. Leaderboard Panel -->
  <rect x="41" y="347" width="205" height="422" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url(#panel-shadow)" />

  <!-- 5. Hours Overview Panel -->
  <rect x="269" y="347" width="891" height="422" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url(#panel-shadow)" />
</svg>`;

  const resvg = new Resvg(staticContainersSvg, {
    fitTo: { mode: 'width', value: 1200 },
    background: 'rgba(0,0,0,0)',
  });

  const bakedPngBuffer = resvg.render().asPng();
  writeFileSync(BAKED_PNG_PATH, bakedPngBuffer);
  console.log(`[bake-assets] Wrote baked container PNG (${bakedPngBuffer.length} bytes) to ${BAKED_PNG_PATH}`);

  const base64Png = bakedPngBuffer.toString('base64');
  const bakedImageTag = `<!-- Pre-rendered Baked Container Layer (Outer card + 4 panels with shadows) -->\n    <image href="data:image/png;base64,${base64Png}" x="0" y="0" width="1200" height="835" />`;

  // Read raw SVG
  let rawSvg = readFileSync(RAW_SVG_PATH, 'utf-8');

  // Remove the two filter definitions
  rawSvg = rawSvg.replace(
    /<!-- Main Outer Card Drop Shadow -->[\s\S]*?<!-- Subtle Inner Panel Shadow -->[\s\S]*?<\/filter>/,
    '<!-- Filters removed: replaced by baked static layer -->'
  );

  // Replace Main Outer White Card
  rawSvg = rawSvg.replace(
    /<!-- Main Outer White Card -->\s*<rect[^>]*filter="url\(#card-shadow\)"[^>]*\/>/,
    `${bakedImageTag}`
  );

  // In each panel, the rect has filter="url(#panel-shadow)". Remove those rects since they are baked!
  // Panel 1: Summary Counters
  rawSvg = rawSvg.replace(
    /<rect x="0" y="0" width="516" height="104" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url\(#panel-shadow\)" \/>/,
    '<!-- Panel 1 background baked in container layer -->'
  );

  // Panel 2: Last 7 Days Chart
  rawSvg = rawSvg.replace(
    /<rect x="0" y="0" width="516" height="158" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url\(#panel-shadow\)" \/>/,
    '<!-- Panel 2 background baked in container layer -->'
  );

  // Panel 3: Leaderboard
  rawSvg = rawSvg.replace(
    /<rect x="0" y="0" width="205" height="422" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url\(#panel-shadow\)" \/>/,
    '<!-- Panel 3 background baked in container layer -->'
  );

  // Panel 4: Hours Overview
  rawSvg = rawSvg.replace(
    /<rect x="0" y="0" width="891" height="422" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url\(#panel-shadow\)" \/>/,
    '<!-- Panel 4 background baked in container layer -->'
  );

  writeFileSync(BAKED_SVG_PATH, rawSvg);
  console.log(`[bake-assets] Wrote baked profile SVG to ${BAKED_SVG_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bakeVoiceProfileAssets().catch((err) => {
    console.error('[bake-assets] Error baking assets:', err);
    process.exit(1);
  });
}
