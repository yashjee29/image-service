import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { avatarCache } from '../src/core/images/avatar-cache.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { SvgRenderer } from '../src/core/renderer/svg-renderer.js';
import { mapVoiceLeaderboardData } from '../src/modules/voice-leaderboard/data-mapper.js';
import { templateRegistry } from '../src/core/templates/template-registry.js';

async function profile() {
  fontRegistry.initialize();
  await rankAssetCache.initialize();
  await leaderboardAssetCache.initialize();

  const payload = {
    schemaVersion: '1.0',
    requestId: 'prof-001',
    requestContext: { requesterUserId: 'user-002' },
    render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1 },
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: Array.from({ length: 11 }, (_, i) => ({
        position: i + 1,
        userId: `user-${i + 1}`,
        username: `User ${i + 1}`,
        avatarUrl: `https://example.com/avatar/${i + 1}.png`,
        durationMinutes: 10000 - i * 500,
        rank: { id: 'ascendant', name: 'Ascendant' },
      })),
    },
  };

  // Warm up avatar cache
  for (let i = 1; i <= 11; i++) {
    await avatarCache.getAvatarDataUri(`https://example.com/avatar/${i}.png`, i <= 3 ? 160 : 72);
  }

  const iters = 30;
  let tValidate = 0, tAvatars = 0, tSvg = 0, tResvg = 0;

  const template = templateRegistry.get('study-leaderboard-2')!;

  for (let iter = 0; iter < iters; iter++) {
    const s1 = performance.now();
    const validated = voiceLeaderboardModule.validate(payload);
    const s2 = performance.now();
    tValidate += (s2 - s1);

    const avatarMap: Record<number, string> = {};
    for (const e of validated.entries) {
      avatarMap[e.rank] = await avatarCache.getAvatarDataUri(e.avatarUrl!, e.rank <= 3 ? 160 : 72);
    }
    const s3 = performance.now();
    tAvatars += (s3 - s2);

    const svg = mapVoiceLeaderboardData(template.content, validated, avatarMap);
    const s4 = performance.now();
    tSvg += (s4 - s3);

    const png = SvgRenderer.renderToPng({ svgContent: svg, width: 1536 });
    const s5 = performance.now();
    tResvg += (s5 - s4);
  }

  console.log(`=== Leaderboard Render Profiling Breakdown (Average over ${iters} runs) ===`);
  console.log(`1. Zod Input Validation:    ${(tValidate / iters).toFixed(2)} ms`);
  console.log(`2. Avatar Retrieval (LRU):  ${(tAvatars / iters).toFixed(2)} ms`);
  console.log(`3. SVG Dynamic Replacements:${(tSvg / iters).toFixed(2)} ms`);
  console.log(`4. Resvg Rasterization:     ${(tResvg / iters).toFixed(2)} ms`);
  console.log(`-----------------------------------------------------------------`);
  console.log(`Total In-Memory Render:     ${((tValidate + tAvatars + tSvg + tResvg) / iters).toFixed(2)} ms`);
}

profile().catch(console.error);
