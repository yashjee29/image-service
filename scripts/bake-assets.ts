import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');

// ==========================================
// 1. Voice Profile Baking
// ==========================================
const PROFILE_RAW_SVG_PATH = resolve(ROOT_DIR, 'templates/voice-profile/profile-raw.svg');
const PROFILE_BAKED_PNG_PATH = resolve(ROOT_DIR, 'assets/profile/card-background-baked.png');
const PROFILE_BAKED_SVG_PATH = resolve(ROOT_DIR, 'templates/voice-profile/profile.svg');

export async function bakeVoiceProfileAssets(): Promise<void> {
  console.log('[bake-assets] Generating static baked shadow container for Voice Profile...');

  const staticContainersSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 835" width="1200" height="835">
  <defs>
    <!-- Main Outer Card Drop Shadow -->
    <filter id="card-shadow" x="-3%" y="-3%" width="106%" height="108%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#2D1F18" flood-opacity="0.06" />
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#2D1F18" flood-opacity="0.03" />
    </filter>

    <!-- Subtle Inner Panel Shadow -->
    <filter id="panel-shadow" x="-4%" y="-4%" width="108%" height="112%">
      <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#2D1F18" flood-opacity="0.02" />
    </filter>
  </defs>

  <!-- 1. Main Outer Card -->
  <rect x="20" y="30" width="1160" height="772" rx="36" fill="#FFFFFF" stroke="#EFE8E5" stroke-width="1" filter="url(#card-shadow)" />

  <!-- 2. Summary Counters Panel -->
  <rect x="644" y="62" width="516" height="104" rx="16" fill="#FFFFFF" stroke="#EFE8E5" stroke-width="1.5" filter="url(#panel-shadow)" />

  <!-- 3. 7-Day Chart Panel -->
  <rect x="644" y="176" width="516" height="158" rx="16" fill="#FFFFFF" stroke="#EFE8E5" stroke-width="1.5" filter="url(#panel-shadow)" />

  <!-- 4. Leaderboard Panel -->
  <rect x="41" y="347" width="205" height="422" rx="16" fill="#FFFFFF" stroke="#EFE8E5" stroke-width="1.5" filter="url(#panel-shadow)" />

  <!-- 5. Hours Overview Panel -->
  <rect x="269" y="347" width="891" height="422" rx="16" fill="#FFFFFF" stroke="#EFE8E5" stroke-width="1.5" filter="url(#panel-shadow)" />
</svg>`;

  const resvg = new Resvg(staticContainersSvg, {
    fitTo: { mode: 'width', value: 1200 },
    background: 'rgba(0,0,0,0)',
  });

  const bakedPngBuffer = resvg.render().asPng();
  writeFileSync(PROFILE_BAKED_PNG_PATH, bakedPngBuffer);
  console.log(`[bake-assets] Wrote baked profile container PNG (${bakedPngBuffer.length} bytes) to ${PROFILE_BAKED_PNG_PATH}`);

  const base64Png = bakedPngBuffer.toString('base64');
  const bakedImageTag = `<!-- Pre-rendered Baked Container Layer (Outer card + 4 panels with shadows) -->\n    <image href="data:image/png;base64,${base64Png}" x="0" y="0" width="1200" height="835" />`;

  let rawSvg = readFileSync(PROFILE_RAW_SVG_PATH, 'utf-8');

  rawSvg = rawSvg.replace(
    /<!-- Main Outer Card Drop Shadow -->[\s\S]*?<!-- Subtle Inner Panel Shadow -->[\s\S]*?<\/filter>/,
    '<!-- Filters removed: replaced by baked static layer -->'
  );

  rawSvg = rawSvg.replace(
    /<!-- Main Outer White Card -->\s*<rect[^>]*filter="url\(#card-shadow\)"[^>]*\/>/,
    `${bakedImageTag}`
  );

  rawSvg = rawSvg.replace(
    /<rect x="0" y="0" width="516" height="104" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url\(#panel-shadow\)" \/>/,
    '<!-- Panel 1 background baked in container layer -->'
  );

  rawSvg = rawSvg.replace(
    /<rect x="0" y="0" width="516" height="158" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url\(#panel-shadow\)" \/>/,
    '<!-- Panel 2 background baked in container layer -->'
  );

  rawSvg = rawSvg.replace(
    /<rect x="0" y="0" width="205" height="422" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url\(#panel-shadow\)" \/>/,
    '<!-- Panel 3 background baked in container layer -->'
  );

  rawSvg = rawSvg.replace(
    /<rect x="0" y="0" width="891" height="422" rx="16" fill="#FFFFFF" stroke="#E9EEF5" stroke-width="1.5" filter="url\(#panel-shadow\)" \/>/,
    '<!-- Panel 4 background baked in container layer -->'
  );

  writeFileSync(PROFILE_BAKED_SVG_PATH, rawSvg);
  console.log(`[bake-assets] Wrote baked profile SVG to ${PROFILE_BAKED_SVG_PATH}`);
}

// ==========================================
// 2. Study Leaderboard Baking
// ==========================================
const LEADERBOARD_DIR = resolve(ROOT_DIR, 'templates/voice-leaderboard');
const ASSETS_LEADERBOARD_DIR = resolve(ROOT_DIR, 'assets/leaderboard');

export async function bakeStudyLeaderboardAssets(): Promise<void> {
  console.log('[bake-assets] Generating static baked shadow backgrounds for Study Leaderboards...');

  // --- A. Podium Template (study-leaderboard-2.svg) ---
  const podiumStaticSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
<defs>
 <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdfa"/><stop offset="1" stop-color="#fff9f5"/></linearGradient>
 <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#a38c7e" flood-opacity=".09"/></filter>
</defs>
<!-- 1. Main outer paper card with soft shadow -->
<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url(#paper)" stroke="#eadfd7" stroke-width="1" filter="url(#softShadow)"/>
<!-- 2. Radial/ellipse background glow -->
<ellipse cx="770" cy="500" rx="630" ry="485" fill="#fffefd" stroke="none" stroke-width="0" opacity=".28"/>
<!-- 3. Desk paper clip -->
<g id="paper-clip">
<path d="M57 58 C48 48 42 59 50 69 L74 102 C81 112 95 103 88 93 L65 61 C60 54 52 60 57 68 L77 96" fill="none" stroke="#c9a187" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
<path d="M62 57 C56 53 52 60 57 67 L77 96" fill="none" stroke="#f2d7c4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</g>
<!-- 4. Bookmark -->
<g id="bookmark">
<path d="M1460 15 L1492 15 L1492 74 L1476 61 L1460 74 Z" fill="#f0d1ba" stroke="#d6ae92" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1464 18 L1488 18 L1488 67" fill="none" stroke="#f8e4d5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
</g>
<!-- 5. Decorative stars -->
<g id="decorative-stars">
<path d="M68.00,175.00 L70.42,191.58 L87.00,194.00 L70.42,196.42 L68.00,213.00 L65.58,196.42 L49.00,194.00 L65.58,191.58 Z" fill="none" stroke="#62bca8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M115.00,243.00 L116.53,253.47 L127.00,255.00 L116.53,256.53 L115.00,267.00 L113.47,256.53 L103.00,255.00 L113.47,253.47 Z" fill="none" stroke="#ff806a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1469.00,149.00 L1470.78,161.22 L1483.00,163.00 L1470.78,164.78 L1469.00,177.00 L1467.22,164.78 L1455.00,163.00 L1467.22,161.22 Z" fill="none" stroke="#c4a4dc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1466.00,287.00 L1467.65,298.35 L1479.00,300.00 L1467.65,301.65 L1466.00,313.00 L1464.35,301.65 L1453.00,300.00 L1464.35,298.35 Z" fill="none" stroke="#68bca7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M68.00,652.00 L69.02,658.98 L76.00,660.00 L69.02,661.02 L68.00,668.00 L66.98,661.02 L60.00,660.00 L66.98,658.98 Z" fill="none" stroke="#ffb59f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1471.00,706.00 L1472.65,717.35 L1484.00,719.00 L1472.65,720.65 L1471.00,732.00 L1469.35,720.65 L1458.00,719.00 L1469.35,717.35 Z" fill="none" stroke="#67bca7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M75.00,749.00 L76.02,755.98 L83.00,757.00 L76.02,758.02 L75.00,765.00 L73.98,758.02 L67.00,757.00 L73.98,755.98 Z" fill="none" stroke="#c3a2dc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1450.00,672.00 L1450.89,678.11 L1457.00,679.00 L1450.89,679.89 L1450.00,686.00 L1449.11,679.89 L1443.00,679.00 L1449.11,678.11 Z" fill="none" stroke="#ffb49c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1485.00,961.00 L1486.27,969.73 L1495.00,971.00 L1486.27,972.27 L1485.00,981.00 L1483.73,972.27 L1475.00,971.00 L1483.73,969.73 Z" fill="none" stroke="#e5b18d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1460.00,203.00 L1464.55,214.74 L1477.12,215.44 L1467.36,223.39 L1470.58,235.56 L1460.00,228.74 L1449.42,235.56 L1452.64,223.39 L1442.88,215.44 L1455.45,214.74 Z" fill="none" stroke="#ff963d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M43.00,683.00 L47.04,693.43 L58.22,694.06 L49.54,701.13 L52.40,711.94 L43.00,705.88 L33.60,711.94 L36.46,701.13 L27.78,694.06 L38.96,693.43 Z" fill="none" stroke="#ff7f67" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1466.00,782.00 L1470.80,794.39 L1484.07,795.13 L1473.77,803.52 L1477.17,816.37 L1466.00,809.17 L1454.83,816.37 L1458.23,803.52 L1447.93,795.13 L1461.20,794.39 Z" fill="none" stroke="#ff963d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</g>
<!-- 6. Trophy Container & Trophy Icon -->
<rect x="118" y="47" width="90" height="88" rx="17" fill="#fffaf7" stroke="#ffddd3" stroke-width="1" />
<g id="trophy-icon">
  <path d="M148 76 C136 76 134 88 150 94 M178 76 C190 76 192 88 176 94" fill="none" stroke="#e85b4d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M160 105 L160 113 L152 120 L174 120 L166 113 L166 105 Z" fill="#f2a49a" stroke="#e85b4d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M147 71 L179 71 L177 93 Q175 105 163 105 Q151 105 149 93 Z" fill="#ff806c" stroke="#e85b4d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <ellipse cx="163" cy="71" rx="16" ry="4" fill="#ffd0c7" stroke="#e85b4d" stroke-width="2" />
  <polygon points="163,78 165,84 171,85 166,89 168,96 163,92 158,96 160,89 155,85 161,84" fill="#fff5ee" />
</g>
<!-- 7. Notebook & Pencil -->
<g id="notebook">
<path d="M-15 847 L53 807 Q61 804 68 811 L140 1016 L-7 1018 Z" fill="#fffaf5" stroke="#d9b8a0" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" />
<path d="M-7 866 L52 838 L120 1008 M-3 896 L63 868 M7 925 L73 897 M16 955 L84 926 M27 985 L96 955" fill="none" stroke="#e5c9b7" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
<path d="M53 837 Q64 825 72 837 Q78 846 67 853 Q59 858 63 869" fill="none" stroke="#8f6fa5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
<path d="M65 863 Q76 851 84 862 Q90 872 79 879 Q71 884 75 894" fill="none" stroke="#8f6fa5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
<path d="M78 890 Q89 879 97 891 Q102 900 91 907 Q83 912 87 922" fill="none" stroke="#8f6fa5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
</g>
<g id="pencil">
  <path d="M1475.1 862.0 L1490.0 870.0 L1494.3 846.9 L1490.8 845.1 Z" fill="#e6bd93" stroke="#795743" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M1475.1 862.0 L1482.55 866.0 L1492.55 846.0 L1490.8 845.1 Z" fill="#f5d8ad" stroke="none"/>
  <path d="M1482.55 866.0 L1490.0 870.0 L1494.3 846.9 L1492.55 846.0 Z" fill="#d2a174" stroke="none"/>
  <path d="M1490.8 845.1 L1494.3 846.9 L1497.0 837.7 Z" fill="#242322" stroke="#242322" stroke-width="0.35" stroke-linejoin="round"/>
  <path d="M1475.1 862.0 L1490.0 870.0 L1423.0 998.0 L1408.0 990.0 Z" fill="#78c5b0" stroke="#3b8f7f" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M1478.6 864.0 L1483.0 866.4 L1415.8 994.1 L1411.1 991.6 Z" fill="#d8f1db" stroke="none"/>
  <path d="M1485.0 867.4 L1489.0 869.6 L1422.3 997.0 L1418.1 994.8 Z" fill="#409987" stroke="none"/>
  <path d="M1408.0 990.0 L1423.0 998.0 L1418.7 1006.2 L1403.7 998.2 Z" fill="#f8d8ca" stroke="#8a584d" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M1406.8 992.3 L1421.8 1000.3" fill="none" stroke="#b77a6c" stroke-width="1.35" stroke-linecap="round"/>
  <path d="M1404.7 996.3 L1419.7 1004.3" fill="none" stroke="#b77a6c" stroke-width="1.25" stroke-linecap="round"/>
  <path d="M1403.7 998.2 L1418.7 1006.2 L1411.9 1018.6 L1397.8 1011.1 Z" fill="#f5a3a0" stroke="#7a4b44" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M1403.7 998.2 L1418.7 1006.2" fill="none" stroke="#fff0e8" stroke-width="1"/>
  <path d="M1397.8 1011.1 L1411.9 1018.6" fill="none" stroke="#9c655e" stroke-width="1"/>
</g>
</svg>`;

  const podiumResvg = new Resvg(podiumStaticSvg, {
    fitTo: { mode: 'width', value: 1536 },
    background: 'rgba(0,0,0,0)',
  });
  const podiumBakedPng = podiumResvg.render().asPng();
  const podiumPngPath = resolve(ASSETS_LEADERBOARD_DIR, 'study-podium-background-baked.png');
  writeFileSync(podiumPngPath, podiumBakedPng);
  console.log(`[bake-assets] Wrote baked podium background PNG (${podiumBakedPng.length} bytes) to ${podiumPngPath}`);

  const podiumBase64 = podiumBakedPng.toString('base64');
  const podiumImageTag = `<image href="data:image/png;base64,${podiumBase64}" x="0" y="0" width="1536" height="1024" />`;

  const podiumRawPath = resolve(LEADERBOARD_DIR, 'study-leaderboard-2-raw.svg');
  let podiumSvg = readFileSync(podiumRawPath, 'utf-8');

  podiumSvg = podiumSvg.replace(
    /<filter id="softShadow"[\s\S]*?<\/filter>/,
    '<!-- Filter softShadow removed: pre-rendered in baked static background -->'
  );
  podiumSvg = podiumSvg.replace(
    /(id="podium-top-pill-[123]"[^>]*)filter="url\(#softShadow\)"/g,
    '$1'
  );
  podiumSvg = podiumSvg.replace(
    /<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url\(#paper\)" stroke="#eadfd7" stroke-width="1" filter="url\(#softShadow\)"\/>[\s\S]*?(?=<text x="234" y="93")/,
    `${podiumImageTag}\n`
  );
  podiumSvg = podiumSvg.replace(
    /<g id="notebook"[\s\S]*<\/svg>/,
    '</svg>'
  );

  const podiumDestPath = resolve(LEADERBOARD_DIR, 'study-leaderboard-2.svg');
  writeFileSync(podiumDestPath, podiumSvg);
  console.log(`[bake-assets] Wrote baked podium template SVG to ${podiumDestPath}`);

  // --- B. Extended Table Template (study-leaderboard.svg & study-leaderboard-extended.svg) ---
  const extStaticSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
<defs>
 <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdfa"/><stop offset="1" stop-color="#fff9f5"/></linearGradient>
 <filter id="softShadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#b69c8d" flood-opacity=".08"/></filter>
</defs>

<!-- 1. Main Outer Paper Canvas with Soft Shadow -->
<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url(#paper)" stroke="#eadfd7" stroke-width="1" filter="url(#softShadow)"/>

<!-- 2. Trophy Box with Soft Shadow & Trophy Icon -->
<rect x="119" y="47" width="92" height="93" rx="17" fill="#fffaf7" stroke="#f1e2d8" stroke-width="1" filter="url(#softShadow)"/>
<g id="trophy-icon">
  <path d="M150 76 C138 76 136 88 152 94 M180 76 C192 76 194 88 178 94" fill="none" stroke="#e85b4d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M162 105 L162 113 L154 120 L176 120 L168 113 L168 105 Z" fill="#f2a49a" stroke="#e85b4d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M149 71 L181 71 L179 93 Q177 105 165 105 Q153 105 151 93 Z" fill="#ff806c" stroke="#e85b4d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <ellipse cx="165" cy="71" rx="16" ry="4" fill="#ffd0c7" stroke="#e85b4d" stroke-width="2" />
  <polygon points="165,78 167,84 173,85 168,89 170,96 165,92 160,96 162,89 157,85 163,84" fill="#fff5ee" />
</g>



<!-- 5. Curved Side Edges & Paper Clip -->
<g id="curved-side-edges" fill="none" stroke="#eadfd7" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path id="left-curved-side" d="M39 14 C25.2 14 14 25.2 14 39 V989 C14 1002.8 25.2 1014 39 1014" />
  <path id="right-curved-side" d="M1497 14 C1510.8 14 1522 25.2 1522 39 V989 C1522 1002.8 1510.8 1014 1497 1014" />
</g>
<g id="paper-clip">
<path d="M57 58 C48 48 42 59 50 69 L74 102 C81 112 95 103 88 93 L65 61 C60 54 52 60 57 68 L77 96" fill="none" stroke="#c9a187" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
<path d="M62 57 C56 53 52 60 57 67 L77 96" fill="none" stroke="#f2d7c4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</g>

<!-- 6. Bookmark -->
<g id="bookmark">
<path d="M1460 15 L1492 15 L1492 74 L1476 61 L1460 74 Z" fill="#f0d1ba" stroke="#d6ae92" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1464 18 L1488 18 L1488 67" fill="none" stroke="#f8e4d5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
</g>

<!-- 7. Decorative Stars -->
<g id="decorative-stars">
<path d="M68.00,175.00 L70.42,191.58 L87.00,194.00 L70.42,196.42 L68.00,213.00 L65.58,196.42 L49.00,194.00 L65.58,191.58 Z" fill="none" stroke="#62bca8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M115.00,243.00 L116.53,253.47 L127.00,255.00 L116.53,256.53 L115.00,267.00 L113.47,256.53 L103.00,255.00 L113.47,253.47 Z" fill="none" stroke="#ff806a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1469.00,149.00 L1470.78,161.22 L1483.00,163.00 L1470.78,164.78 L1469.00,177.00 L1467.22,164.78 L1455.00,163.00 L1467.22,161.22 Z" fill="none" stroke="#c4a4dc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1466.00,287.00 L1467.65,298.35 L1479.00,300.00 L1467.65,301.65 L1466.00,313.00 L1464.35,301.65 L1453.00,300.00 L1464.35,298.35 Z" fill="none" stroke="#68bca7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M68.00,652.00 L69.02,658.98 L76.00,660.00 L69.02,661.02 L68.00,668.00 L66.98,661.02 L60.00,660.00 L66.98,658.98 Z" fill="none" stroke="#ffb59f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1471.00,706.00 L1472.65,717.35 L1484.00,719.00 L1472.65,720.65 L1471.00,732.00 L1469.35,720.65 L1458.00,719.00 L1469.35,717.35 Z" fill="none" stroke="#67bca7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M75.00,749.00 L76.02,755.98 L83.00,757.00 L76.02,758.02 L75.00,765.00 L73.98,758.02 L67.00,757.00 L73.98,755.98 Z" fill="none" stroke="#c3a2dc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1450.00,672.00 L1450.89,678.11 L1457.00,679.00 L1450.89,679.89 L1450.00,686.00 L1449.11,679.89 L1443.00,679.00 L1449.11,678.11 Z" fill="none" stroke="#ffb49c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1485.00,961.00 L1486.27,969.73 L1495.00,971.00 L1486.27,972.27 L1485.00,981.00 L1483.73,972.27 L1475.00,971.00 L1483.73,969.73 Z" fill="none" stroke="#e5b18d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1460.00,203.00 L1464.55,214.74 L1477.12,215.44 L1467.36,223.39 L1470.58,235.56 L1460.00,228.74 L1449.42,235.56 L1452.64,223.39 L1442.88,215.44 L1455.45,214.74 Z" fill="none" stroke="#ff963d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M43.00,683.00 L47.04,693.43 L58.22,694.06 L49.54,701.13 L52.40,711.94 L43.00,705.88 L33.60,711.94 L36.46,701.13 L27.78,694.06 L38.96,693.43 Z" fill="none" stroke="#ff7f67" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1466.00,782.00 L1470.80,794.39 L1484.07,795.13 L1473.77,803.52 L1477.17,816.37 L1466.00,809.17 L1454.83,816.37 L1458.23,803.52 L1447.93,795.13 L1461.20,794.39 Z" fill="none" stroke="#ff963d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</g>

<!-- 8. Notebook & Pencil -->
<g id="notebook">
<path d="M-15 847 L53 807 Q61 804 68 811 L140 1016 L-7 1018 Z" fill="#fffaf5" stroke="#d9b8a0" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" />
<path d="M-7 866 L52 838 L120 1008 M-3 896 L63 868 M7 925 L73 897 M16 955 L84 926 M27 985 L96 955" fill="none" stroke="#e5c9b7" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
<path d="M53 837 Q64 825 72 837 Q78 846 67 853 Q59 858 63 869" fill="none" stroke="#8f6fa5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
<path d="M65 863 Q76 851 84 862 Q90 872 79 879 Q71 884 75 894" fill="none" stroke="#8f6fa5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
<path d="M78 890 Q89 879 97 891 Q102 900 91 907 Q83 912 87 922" fill="none" stroke="#8f6fa5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
</g>
<g id="pencil">
  <path d="M1475.1 862.0 L1490.0 870.0 L1494.3 846.9 L1490.8 845.1 Z" fill="#e6bd93" stroke="#795743" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M1475.1 862.0 L1482.55 866.0 L1492.55 846.0 L1490.8 845.1 Z" fill="#f5d8ad" stroke="none" />
  <path d="M1482.55 866.0 L1490.0 870.0 L1494.3 846.9 L1492.55 846.0 Z" fill="#d2a174" stroke="none" />
  <path d="M1490.8 845.1 L1494.3 846.9 L1497.0 837.7 Z" fill="#242322" stroke="#242322" stroke-width="0.35" stroke-linejoin="round" />
  <path d="M1475.1 862.0 L1490.0 870.0 L1423.0 998.0 L1408.0 990.0 Z" fill="#78c5b0" stroke="#3b8f7f" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M1478.6 864.0 L1483.0 866.4 L1415.8 994.1 L1411.1 991.6 Z" fill="#d8f1db" stroke="none" />
  <path d="M1485.0 867.4 L1489.0 869.6 L1422.3 997.0 L1418.1 994.8 Z" fill="#409987" stroke="none" />
  <path d="M1408.0 990.0 L1423.0 998.0 L1418.7 1006.2 L1403.7 998.2 Z" fill="#f8d8ca" stroke="#8a584d" stroke-width="1.1" stroke-linejoin="round" />
  <path d="M1406.8 992.3 L1421.8 1000.3" fill="none" stroke="#b77a6c" stroke-width="1.35" stroke-linecap="round" />
  <path d="M1404.7 996.3 L1419.7 1004.3" fill="none" stroke="#b77a6c" stroke-width="1.25" stroke-linecap="round" />
  <path d="M1403.7 998.2 L1418.7 1006.2 L1411.9 1018.6 L1397.8 1011.1 Z" fill="#f5a3a0" stroke="#7a4b44" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M1403.7 998.2 L1418.7 1006.2" fill="none" stroke="#fff0e8" stroke-width="1" />
  <path d="M1397.8 1011.1 L1411.9 1018.6" fill="none" stroke="#9c655e" stroke-width="1" />
</g>
</svg>`;

  const extResvg = new Resvg(extStaticSvg, {
    fitTo: { mode: 'width', value: 1536 },
    background: 'rgba(0,0,0,0)',
  });
  const extBakedPng = extResvg.render().asPng();
  const extPngPath = resolve(ASSETS_LEADERBOARD_DIR, 'study-list-background-baked.png');
  writeFileSync(extPngPath, extBakedPng);
  console.log(`[bake-assets] Wrote baked extended background PNG (${extBakedPng.length} bytes) to ${extPngPath}`);

  const extBase64 = extBakedPng.toString('base64');
  const extImageTag = `<image href="data:image/png;base64,${extBase64}" x="0" y="0" width="1536" height="1024" />`;

  const extRawPath = resolve(LEADERBOARD_DIR, 'study-leaderboard-raw.svg');
  let extSvg = readFileSync(extRawPath, 'utf-8');

  extSvg = extSvg.replace(
    /<filter id="softShadow"[\s\S]*?<\/filter>/,
    '<!-- Filter softShadow removed: pre-rendered in baked static background -->'
  );
  extSvg = extSvg.replace(
    /<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url\(#paper\)" stroke="#eadfd7" stroke-width="1" filter="url\(#softShadow\)"\/>[\s\S]*?(?=<text x="241" y="97")/,
    `${extImageTag}\n`
  );
  extSvg = extSvg.replace(/<(ns0:)?g [^>]*id="notebook"[\s\S]*<\/svg>/, '</svg>');

  const extDestPath = resolve(LEADERBOARD_DIR, 'study-leaderboard.svg');
  const ext2DestPath = resolve(LEADERBOARD_DIR, 'study-leaderboard-extended.svg');
  writeFileSync(extDestPath, extSvg);
  writeFileSync(ext2DestPath, extSvg);
  console.log(`[bake-assets] Wrote baked extended template SVGs to ${extDestPath} and ${ext2DestPath}`);
}

export async function bakeAllAssets(): Promise<void> {
  await bakeVoiceProfileAssets();
  await bakeStudyLeaderboardAssets();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bakeAllAssets().catch((err) => {
    console.error('[bake-assets] Error baking assets:', err);
    process.exit(1);
  });
}
