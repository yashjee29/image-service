import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');
const RAW_SVG_PATH = resolve(ROOT_DIR, 'templates/voice-profile/profile-raw.svg');
const BAKED_SVG_PATH = resolve(ROOT_DIR, 'templates/voice-profile/profile.svg');

export interface ComparisonResult {
  width: number;
  height: number;
  totalPixels: number;
  differingPixels: number;
  diffPercentage: number;
  maxChannelDelta: number;
  mse: number;
  psnr: number;
  rawRenderTimeMs: number;
  bakedRenderTimeMs: number;
  speedup: number;
}

export function compareImages(rawPngBuffer: Buffer, bakedPngBuffer: Buffer): ComparisonResult {
  const img1 = PNG.sync.read(rawPngBuffer);
  const img2 = PNG.sync.read(bakedPngBuffer);

  const { width, height } = img1;
  const totalPixels = width * height;
  const diffPng = new PNG({ width, height });

  const numDiffPixels = pixelmatch(img1.data, img2.data, diffPng.data, width, height, {
    threshold: 0.01,
    includeAA: true,
  });

  // Calculate MSE & PSNR
  let sumSquaredError = 0;
  let maxChannelDelta = 0;
  const totalValues = width * height * 4;

  for (let i = 0; i < totalValues; i++) {
    const d1 = img1.data[i] ?? 0;
    const d2 = img2.data[i] ?? 0;
    const diff = Math.abs(d1 - d2);
    if (diff > maxChannelDelta) {
      maxChannelDelta = diff;
    }
    sumSquaredError += diff * diff;
  }

  const mse = sumSquaredError / totalValues;
  const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);

  return {
    width,
    height,
    totalPixels,
    differingPixels: numDiffPixels,
    diffPercentage: (numDiffPixels / totalPixels) * 100,
    maxChannelDelta,
    mse,
    psnr,
    rawRenderTimeMs: 0,
    bakedRenderTimeMs: 0,
    speedup: 0,
  };
}

export async function runComparison(): Promise<ComparisonResult> {
  const rawSvg = readFileSync(RAW_SVG_PATH, 'utf-8');
  const bakedSvg = readFileSync(BAKED_SVG_PATH, 'utf-8');

  // Render raw
  const startRaw = performance.now();
  const rawResvg = new Resvg(rawSvg, {
    fitTo: { mode: 'width', value: 1200 },
    background: 'rgba(0,0,0,0)',
  });
  const rawPng = rawResvg.render().asPng();
  const rawTime = performance.now() - startRaw;

  // Render baked
  const startBaked = performance.now();
  const bakedResvg = new Resvg(bakedSvg, {
    fitTo: { mode: 'width', value: 1200 },
    background: 'rgba(0,0,0,0)',
  });
  const bakedPng = bakedResvg.render().asPng();
  const bakedTime = performance.now() - startBaked;

  const result = compareImages(rawPng, bakedPng);
  result.rawRenderTimeMs = rawTime;
  result.bakedRenderTimeMs = bakedTime;
  result.speedup = rawTime / bakedTime;

  console.log('================================================================================');
  console.log('                 RAW DYNAMIC VS BAKED SHADOW COMPARISON');
  console.log('================================================================================');
  console.log(`Canvas Dimensions:       ${result.width} x ${result.height}`);
  console.log(`Total Canvas Pixels:     ${result.totalPixels.toLocaleString()}`);
  console.log(`Differing Pixels:        ${result.differingPixels} (${result.diffPercentage.toFixed(4)}%)`);
  console.log(`Max Channel Delta:       ${result.maxChannelDelta}`);
  console.log(`Mean Squared Error:      ${result.mse.toFixed(6)}`);
  console.log(`PSNR:                    ${result.psnr === Infinity ? 'Infinity dB' : `${result.psnr.toFixed(2)} dB`}`);
  console.log(`Raw Render Latency:      ${result.rawRenderTimeMs.toFixed(2)} ms`);
  console.log(`Baked Render Latency:    ${result.bakedRenderTimeMs.toFixed(2)} ms`);
  console.log(`Speedup Factor:          ${result.speedup.toFixed(2)}x faster`);
  console.log('================================================================================');

  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runComparison().catch((err) => {
    console.error('[compare-images] Error:', err);
    process.exit(1);
  });
}
