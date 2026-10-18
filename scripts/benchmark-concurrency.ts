import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { renderVoiceLeaderboard } from '../src/modules/voice-leaderboard/renderer.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';
import { DISCORD_CDN_AVATARS } from './benchmark-discord-cdn-leaderboard.js';

async function main() {
  fontRegistry.initialize();
  await rankAssetCache.initialize();
  await leaderboardAssetCache.initialize();

  const makePayload = (userIndex: number) => ({
    schemaVersion: '1.0',
    requestId: `concurrent-req-${userIndex}`,
    requestContext: { requesterUserId: `user-00${(userIndex % 11) + 1}` },
    render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1, layout: 'podium_and_list', highlightRequester: true },
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: DISCORD_CDN_AVATARS.map((item, idx) => ({
        position: item.rank,
        userId: `user-00${item.rank}`,
        username: item.name,
        avatarUrl: item.url,
        durationMinutes: 19260 - idx * 1200 + userIndex * 50,
        rank: {
          id: idx === 0 ? 'immortal' : (idx === 1 ? 'ascendant' : (idx < 5 ? 'diamond' : 'gold')),
          name: idx === 0 ? 'Immortal' : (idx === 1 ? 'Ascendant' : (idx < 5 ? 'Diamond' : 'Gold')),
        },
      })),
    },
  });

  // Pre-warm avatars in memory
  const warmupCtx = createRenderContext('study-leaderboard-2');
  await renderVoiceLeaderboard(voiceLeaderboardModule.validate(makePayload(0)), warmupCtx);

  console.log('================================================================================');
  console.log('  CONCURRENCY BENCHMARK: 10 SIMULTANEOUS USER LEADERBOARD RENDERS');
  console.log('================================================================================\n');

  const t0 = performance.now();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    const c = createRenderContext('study-leaderboard-2');
    const p = voiceLeaderboardModule.validate(makePayload(i + 1));
    const start = performance.now();
    promises.push(renderVoiceLeaderboard(p, c).then(() => performance.now() - start));
  }

  const latencies = await Promise.all(promises);
  const totalBatchMs = performance.now() - t0;
  latencies.sort((a, b) => a - b);

  console.log(`• Total Batch Duration for 10 Users: ${totalBatchMs.toFixed(2)} ms`);
  console.log(`• Effective Multi-Core Throughput:    ${((10 / totalBatchMs) * 1000).toFixed(1)} renders/sec`);
  console.log(`• Average Latency per User:          ${(latencies.reduce((a, b) => a + b, 0) / 10).toFixed(2)} ms`);
  console.log(`• Median Latency (P50):              ${latencies[Math.floor(10 * 0.50)].toFixed(2)} ms`);
  console.log(`• 95th Percentile Latency (P95):     ${latencies[Math.floor(10 * 0.95)].toFixed(2)} ms`);
  console.log(`• Min / Max Latency:                 ${latencies[0].toFixed(2)} ms / ${latencies[9].toFixed(2)} ms`);
  console.log('================================================================================');
}

main().catch(console.error);
