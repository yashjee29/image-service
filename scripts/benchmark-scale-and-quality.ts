import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';
import sharp from 'sharp';

async function main() {
  fontRegistry.initialize();
  await rankAssetCache.initialize(256);
  await leaderboardAssetCache.initialize(160);

  const payloadScale1 = {
    schemaVersion: '1.0',
    requestId: 'bench-scale1',
    render: {
      templateId: 'study-leaderboard-v1',
      format: 'png',
      scale: 1,
    },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: [
        { position: 1, username: 'Aarav', durationMinutes: 19260, rank: { id: 'immortal', name: 'Immortal' } },
        { position: 2, username: 'Sakha', durationMinutes: 17040, rank: { id: 'ascendant', name: 'Ascendant' } },
        { position: 3, username: 'Mira', durationMinutes: 15060, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 4, username: 'PixelDreams', durationMinutes: 13680, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 5, username: 'Kabir', durationMinutes: 12420, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 6, username: 'Anaya', durationMinutes: 11580, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 7, username: 'Dev', durationMinutes: 10560, rank: { id: 'gold', name: 'Gold' } },
        { position: 8, username: 'Isha', durationMinutes: 9840, rank: { id: 'gold', name: 'Gold' } },
        { position: 9, username: 'Neel', durationMinutes: 8940, rank: { id: 'silver', name: 'Silver' } },
        { position: 10, username: 'Tara', durationMinutes: 7920, rank: { id: 'silver', name: 'Silver' } },
        { position: 11, username: 'HexCode', durationMinutes: 7260, rank: { id: 'bronze', name: 'Bronze' } },
      ],
    },
  };

  const payloadScale2 = JSON.parse(JSON.stringify(payloadScale1));
  payloadScale2.requestId = 'bench-scale2';
  payloadScale2.render.scale = 2;

  const v1 = voiceLeaderboardModule.validate(payloadScale1);
  const c1 = createRenderContext('study-leaderboard-v1');
  const buf1 = await voiceLeaderboardModule.render(v1, c1);
  const meta1 = await sharp(buf1).metadata();

  const v2 = voiceLeaderboardModule.validate(payloadScale2);
  const c2 = createRenderContext('study-leaderboard-v1');
  const buf2 = await voiceLeaderboardModule.render(v2, c2);
  const meta2 = await sharp(buf2).metadata();

  // Warmup complete
  const iterations = 20;

  // Measure Scale 1
  const times1: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await voiceLeaderboardModule.render(v1, c1);
    times1.push(performance.now() - t0);
  }

  // Measure Scale 2
  const times2: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await voiceLeaderboardModule.render(v2, c2);
    times2.push(performance.now() - t0);
  }

  const calc = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.50)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    return { avg, p50, p95, min, max };
  };

  const s1 = calc(times1);
  const s2 = calc(times2);

  console.log('========================================================================');
  console.log('LEADERBOARD RENDER BENCHMARK (SCALE 1 vs SCALE 2)');
  console.log('========================================================================');
  console.log(`Scale 1 (Fast Mode - ${meta1.width}x${meta1.height}, Output: ${(buf1.length / 1024).toFixed(1)} KB):`);
  console.log(`  Average Latency: ${s1.avg.toFixed(2)} ms`);
  console.log(`  P50 Latency:     ${s1.p50.toFixed(2)} ms`);
  console.log(`  P95 Latency:     ${s1.p95.toFixed(2)} ms`);
  console.log(`  Min / Max:       ${s1.min.toFixed(2)} ms / ${s1.max.toFixed(2)} ms`);
  console.log(`  Throughput:      ${(1000 / s1.avg).toFixed(1)} renders/sec`);
  console.log('------------------------------------------------------------------------');
  console.log(`Scale 2 (Full Retina - ${meta2.width}x${meta2.height}, Output: ${(buf2.length / 1024).toFixed(1)} KB):`);
  console.log(`  Average Latency: ${s2.avg.toFixed(2)} ms`);
  console.log(`  P50 Latency:     ${s2.p50.toFixed(2)} ms`);
  console.log(`  P95 Latency:     ${s2.p95.toFixed(2)} ms`);
  console.log(`  Min / Max:       ${s2.min.toFixed(2)} ms / ${s2.max.toFixed(2)} ms`);
  console.log(`  Throughput:      ${(1000 / s2.avg).toFixed(1)} renders/sec`);
  console.log('------------------------------------------------------------------------');
  console.log(`Performance Advantage of Scale 1:`);
  console.log(`  Latency Reduction: ${((1 - s1.avg / s2.avg) * 100).toFixed(1)}% faster`);
  console.log(`  Throughput Gain:   ${(s2.avg / s1.avg).toFixed(2)}x more requests/sec`);
  console.log(`  Payload Reduction: ${((1 - buf1.length / buf2.length) * 100).toFixed(1)}% smaller response payload`);
  console.log('========================================================================');
}

main().catch(console.error);
