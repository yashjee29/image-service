import fs from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { SvgRenderer } from '../src/core/renderer/svg-renderer.js';
import { mapVoiceLeaderboardData } from '../src/modules/voice-leaderboard/data-mapper.js';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const TARGET_DIR = resolve(process.cwd(), 'artifacts');

const AVATAR_COLORS = [
  { r: 235, g: 87, b: 87 },
  { r: 242, g: 153, b: 74 },
  { r: 242, g: 201, b: 76 },
  { r: 33, g: 150, b: 83 },
  { r: 47, g: 128, b: 237 },
  { r: 155, g: 81, b: 224 },
  { r: 111, g: 207, b: 151 },
  { r: 86, g: 204, b: 242 },
  { r: 235, g: 87, b: 130 },
  { r: 189, g: 189, b: 189 },
  { r: 79, g: 79, b: 79 },
];

async function generateSampleAvatar(color: { r: number; g: number; b: number }, size: number): Promise<string> {
  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...color, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  fontRegistry.initialize();
  await rankAssetCache.initialize(); // Clean 80px & 120px Lanczos3
  await leaderboardAssetCache.initialize(); // Clean 92px trimmed Lanczos3 Supersampling

  const testPayload = {
    schemaVersion: '1.0',
    requestId: 'export-tier1-001',
    render: {
      templateId: 'study-leaderboard-v1',
      format: 'png',
      scale: 1,
    },
    title: 'Study Leaderboard',
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: [
        { position: 1, username: 'Aarav Sharma', durationMinutes: 19260, rank: { id: 'immortal', name: 'Immortal' } },
        { position: 2, username: 'Sakha', durationMinutes: 17040, rank: { id: 'ascendant', name: 'Ascendant' }, isCurrentUser: true },
        { position: 3, username: 'Mira K.', durationMinutes: 15060, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 4, username: 'PixelDreams', durationMinutes: 13680, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 5, username: 'Kabir V.', durationMinutes: 12420, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 6, username: 'Anaya Roy', durationMinutes: 11580, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 7, username: 'Dev Patel', durationMinutes: 10560, rank: { id: 'gold', name: 'Gold' } },
        { position: 8, username: 'Isha Gupta', durationMinutes: 9840, rank: { id: 'gold', name: 'Gold' } },
        { position: 9, username: 'Neel Mehta', durationMinutes: 8940, rank: { id: 'silver', name: 'Silver' } },
        { position: 10, username: 'Tara Sen', durationMinutes: 7920, rank: { id: 'silver', name: 'Silver' } },
        { position: 11, username: 'HexCode', durationMinutes: 7260, rank: { id: 'bronze', name: 'Bronze' } },
      ],
    },
  };

  const avatarMap: Record<number, string> = {};
  for (let i = 1; i <= 11; i++) {
    const color = AVATAR_COLORS[(i - 1) % AVATAR_COLORS.length]!;
    const diameter = i <= 3 ? 160 : 72;
    avatarMap[i] = await generateSampleAvatar(color, diameter);
  }

  const validated = voiceLeaderboardModule.validate(testPayload);
  const rawSvg = fs.readFileSync('templates/voice-leaderboard/study-leaderboard-2.svg', 'utf8');

  // ==========================================
  // 1. BEFORE TIER 1 (Baseline Live Dynamic SVG)
  // ==========================================
  console.log('Rendering Before Tier 1 (Live SVG)...');
  const baselineSvg = mapVoiceLeaderboardData(rawSvg, validated, avatarMap);

  SvgRenderer.renderToPng({ svgContent: baselineSvg, width: 1536 });
  const beforeTimes: number[] = [];
  let pngBefore: Buffer = Buffer.alloc(0);
  for (let i = 0; i < 15; i++) {
    const t0 = performance.now();
    pngBefore = SvgRenderer.renderToPng({ svgContent: baselineSvg, width: 1536 });
    beforeTimes.push(performance.now() - t0);
  }
  const avgBefore = beforeTimes.reduce((a, b) => a + b, 0) / beforeTimes.length;
  console.log(`Before Tier 1 rendered in avg ${avgBefore.toFixed(2)} ms (${pngBefore.length} bytes)`);

  const pathBefore = resolve(TARGET_DIR, 'leaderboard-before-tier1.png');
  fs.writeFileSync(pathBefore, pngBefore);

  // ==========================================
  // 2. AFTER TIER 1 (Baked Static Background)
  // ==========================================
  console.log('\nRendering After Tier 1 (Baked BG)...');
  const pureStaticBgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
<defs>
 <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdfa"/><stop offset="1" stop-color="#fff9f5"/></linearGradient>
 <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#a38c7e" flood-opacity=".09"/></filter>
 <style>.ui{font-family:'Nunito Sans',Nunito,Arial,sans-serif}.outline{stroke-linecap:round;stroke-linejoin:round}</style>
</defs>
<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url(#paper)" stroke="#eadfd7" stroke-width="1" filter="url(#softShadow)"/>
<ellipse cx="770" cy="500" rx="630" ry="485" fill="#fffefd" stroke="none" stroke-width="0" opacity=".28"/>
<g id="paper-clip">
<path d="M57 58 C48 48 42 59 50 69 L74 102 C81 112 95 103 88 93 L65 61 C60 54 52 60 57 68 L77 96" fill="none" stroke="#c9a187" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
<path d="M62 57 C56 53 52 60 57 67 L77 96" fill="none" stroke="#f2d7c4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</g>
<g id="bookmark">
<path d="M1460 15 L1492 15 L1492 74 L1476 61 L1460 74 Z" fill="#f0d1ba" stroke="#d6ae92" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
<path d="M1464 18 L1488 18 L1488 67" fill="none" stroke="#f8e4d5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
</g>
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
<rect x="118" y="47" width="90" height="88" rx="17" fill="#fffaf7" stroke="#ffddd3" stroke-width="1" />
<g id="trophy-icon">
  <path d="M148 76 C136 76 134 88 150 94 M178 76 C190 76 192 88 176 94" fill="none" stroke="#e85b4d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M160 105 L160 113 L152 120 L174 120 L166 113 L166 105 Z" fill="#f2a49a" stroke="#e85b4d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M147 71 L179 71 L177 93 Q175 105 163 105 Q151 105 149 93 Z" fill="#ff806c" stroke="#e85b4d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <ellipse cx="163" cy="71" rx="16" ry="4" fill="#ffd0c7" stroke="#e85b4d" stroke-width="2" />
  <polygon points="163,78 165,84 171,85 166,89 168,96 163,92 158,96 160,89 155,85 161,84" fill="#fff5ee" />
</g>
<!-- Podium Cards Base Rects -->
<rect id="podium-card-rect-2" x="179" y="201" width="364" height="423" rx="29" fill="#fffdfa" stroke="#c5ded5" stroke-width="1.2" />
<rect id="podium-card-rect-1" x="571" y="181" width="398" height="443" rx="29" fill="#fffdfa" stroke="#ff9b8f" stroke-width="1.2" />
<rect id="podium-card-rect-3" x="992" y="201" width="352" height="423" rx="29" fill="#fffdfa" stroke="#e4d5ee" stroke-width="1.2" />
<!-- Podium Top Pills with Shadow -->
<rect id="podium-top-pill-2" x="298.5" y="172" width="125" height="52" rx="19" fill="#fffaf7" stroke="#f0e3dc" stroke-width="1" filter="url(#softShadow)"/>
<rect id="podium-top-pill-1" x="704.5" y="160" width="139" height="52" rx="19" fill="#fffaf7" stroke="#f0e3dc" stroke-width="1" filter="url(#softShadow)"/>
<rect id="podium-top-pill-3" x="1096.5" y="172" width="127" height="52" rx="19" fill="#fffaf7" stroke="#f0e3dc" stroke-width="1" filter="url(#softShadow)"/>
</svg>`;

  const bakedBgPng = SvgRenderer.renderToPng({ svgContent: pureStaticBgSvg, width: 1536 });
  const base64Bg = bakedBgPng.toString('base64');

  let tier1Svg = rawSvg.replace(/<filter id="softShadow"[\s\S]*?<\/filter>/, '');

  tier1Svg = tier1Svg.replace(
    /<rect x="14" y="14" width="1508" height="1000" rx="25" fill="url\(#paper\)" stroke="#eadfd7" stroke-width="1" filter="url\(#softShadow\)"\/>[\s\S]*?<\/g>\s*<rect x="118" y="47"[\s\S]*?<\/g>\s*(?=<text x="234" y="93")/,
    `<image href="data:image/png;base64,${base64Bg}" x="0" y="0" width="1536" height="1024" />\n`
  );

  tier1Svg = tier1Svg.replace(/<rect id="podium-card-rect-2"[^>]*\/>/g, '<!-- podium-card-rect-2 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-card-rect-1"[^>]*\/>/g, '<!-- podium-card-rect-1 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-card-rect-3"[^>]*\/>/g, '<!-- podium-card-rect-3 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-top-pill-2"[^>]*\/>/g, '<!-- podium-top-pill-2 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-top-pill-1"[^>]*\/>/g, '<!-- podium-top-pill-1 baked in bg -->');
  tier1Svg = tier1Svg.replace(/<rect id="podium-top-pill-3"[^>]*\/>/g, '<!-- podium-top-pill-3 baked in bg -->');

  const dynamicSvgTier1 = mapVoiceLeaderboardData(tier1Svg, validated, avatarMap);

  SvgRenderer.renderToPng({ svgContent: dynamicSvgTier1, width: 1536 });
  const afterTimes: number[] = [];
  let pngAfter: Buffer = Buffer.alloc(0);
  for (let i = 0; i < 15; i++) {
    const t0 = performance.now();
    pngAfter = SvgRenderer.renderToPng({ svgContent: dynamicSvgTier1, width: 1536 });
    afterTimes.push(performance.now() - t0);
  }
  const avgAfter = afterTimes.reduce((a, b) => a + b, 0) / afterTimes.length;
  console.log(`After Tier 1 rendered in avg ${avgAfter.toFixed(2)} ms (${pngAfter.length} bytes)`);

  const pathAfter = resolve(TARGET_DIR, 'leaderboard-after-tier1.png');
  fs.writeFileSync(pathAfter, pngAfter);

  // ==========================================
  // 3. PIXELMATCH DIFF (Strict 100% Parity)
  // ==========================================
  const img1 = PNG.sync.read(pngBefore);
  const img2 = PNG.sync.read(pngAfter);
  const { width, height } = img1;
  const diffPng = new PNG({ width, height });

  const numDiffPixels = pixelmatch(img1.data, img2.data, diffPng.data, width, height, {
    threshold: 0.1,
  });

  const totalPixels = width * height;
  const mismatchPercent = ((numDiffPixels / totalPixels) * 100).toFixed(4);
  const pathDiff = resolve(TARGET_DIR, 'diff-before-vs-after-tier1.png');
  fs.writeFileSync(pathDiff, PNG.sync.write(diffPng));

  // ==========================================
  // 4. PODIUM MEDALS CROP & COMPARISON
  // ==========================================
  const pathPodiumCrop = resolve(TARGET_DIR, 'podium-medals-2x-crop.png');
  const cropBuffer = await sharp(pngAfter)
    .extract({ left: 275, top: 155, width: 980, height: 75 })
    .toBuffer();
  fs.writeFileSync(pathPodiumCrop, cropBuffer);

  const userUploadedScreenshot = '/Users/yashjee/.gemini/antigravity/brain/558b160c-a309-418a-849c-7b34546f9026/.user_uploaded/media_1792344690725_62520c83.png';
  if (fs.existsSync(userUploadedScreenshot)) {
    const orig = await sharp(userUploadedScreenshot)
      .resize(980, 75)
      .toBuffer();

    const svgComp = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="240" viewBox="0 0 1040 240">
      <rect width="1040" height="240" rx="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" />
      <text x="30" y="32" font-family="Nunito Sans, Arial" font-size="15" font-weight="700" fill="#EF4444">BEFORE (Original Aliased / 160px Downsampled):</text>
      <text x="30" y="145" font-family="Nunito Sans, Arial" font-size="15" font-weight="700" fill="#16A34A">AFTER (Clean 2x Lanczos3 Supersampled @ 92px in 1x Canvas):</text>
    </svg>`;

    const compBuffer = await sharp({
      create: { width: 1040, height: 240, channels: 4, background: { r: 248, g: 250, b: 252, alpha: 1 } },
    })
      .composite([
        { input: Buffer.from(svgComp), top: 0, left: 0 },
        { input: orig, top: 44, left: 30 },
        { input: cropBuffer, top: 155, left: 30 },
      ])
      .png()
      .toBuffer();

    fs.writeFileSync(resolve(TARGET_DIR, 'comparison-podium-medals.png'), compBuffer);
  }

  console.log(`\n================================================================================`);
  console.log('TIER 1 ARTIFACTS GENERATION COMPLETE');
  console.log('================================================================================');
  console.log(`• Destination Directory:  ${TARGET_DIR}`);
  console.log(`• Before Tier 1 Image:    ${pathBefore} (${avgBefore.toFixed(2)} ms)`);
  console.log(`• After Tier 1 Image:     ${pathAfter} (${avgAfter.toFixed(2)} ms)`);
  console.log(`• Visual Difference:      ${numDiffPixels} / ${totalPixels} pixels (${mismatchPercent}%)`);
  console.log(`• Latency Speedup:        ${(avgBefore / avgAfter).toFixed(2)}x faster`);
  console.log(`• Podium Crop:            ${pathPodiumCrop}`);
  console.log(`• Podium Comparison:      ${resolve(TARGET_DIR, 'comparison-podium-medals.png')}`);
  console.log('================================================================================\n');
}

main().catch(console.error);
