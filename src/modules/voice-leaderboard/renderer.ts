import { SvgRenderer } from '../../core/renderer/svg-renderer.js';
import type { RenderContext } from '../../core/renderer/renderer.types.js';
import { avatarCache } from '../../core/images/avatar-cache.js';
import { mapVoiceLeaderboardData, type LeaderboardAvatarMap } from './data-mapper.js';
import type { VoiceLeaderboardInput } from './schema.js';
import { voiceLeaderboardConfig } from './config.js';

export async function renderVoiceLeaderboard(
  input: VoiceLeaderboardInput,
  context: RenderContext
): Promise<Buffer> {
  const avatarMap: LeaderboardAvatarMap = {};

  // Fetch & process avatars for entries that supply avatarUrl (with 25MB LRU memory cache)
  const avatarPromises = input.entries
    .filter((entry) => Boolean(entry.avatarUrl))
    .map(async (entry) => {
      try {
        const diameter = entry.rank === 1 ? 120 : 80;
        const uri = await context.measureStage(`avatar_fetch_${entry.rank}`, async () => {
          return await avatarCache.getAvatarDataUri(entry.avatarUrl!, diameter);
        });
        avatarMap[entry.rank] = uri;
      } catch {
        // If an avatar fails to load, gracefully fall back to the vector placeholder
      }
    });

  if (avatarPromises.length > 0) {
    await Promise.all(avatarPromises);
  }

  // Inject data
  const dynamicSvg = await context.measureStage('svg_data_injection', () => {
    return mapVoiceLeaderboardData(context.template.content, input, avatarMap);
  });

  // Rasterize
  const width = context.options?.dimensions?.width ?? voiceLeaderboardConfig.dimensions.width;
  const background = context.options?.background ?? 'rgba(0,0,0,0)';

  return await context.measureStage('resvg_rasterization', () => {
    return SvgRenderer.renderToPng({
      svgContent: dynamicSvg,
      width,
      background,
    });
  });
}
