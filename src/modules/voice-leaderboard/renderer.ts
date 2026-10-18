import { SvgRenderer } from '../../core/renderer/svg-renderer.js';
import type { RenderContext } from '../../core/renderer/renderer.types.js';
import { avatarCache } from '../../core/images/avatar-cache.js';
import { rankAssetCache } from '../../core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../../core/images/leaderboard-asset-cache.js';
import { mapVoiceLeaderboardData, type LeaderboardAvatarMap } from './data-mapper.js';
import type { VoiceLeaderboardInput } from './schema.js';
import { voiceLeaderboardConfig } from './config.js';

export async function renderVoiceLeaderboard(
  input: VoiceLeaderboardInput,
  context: RenderContext
): Promise<Buffer> {
  if (!rankAssetCache.isInitialized()) {
    await rankAssetCache.initialize();
  }
  if (!leaderboardAssetCache.isInitialized()) {
    await leaderboardAssetCache.initialize();
  }
  const isStudy =
    context.template.id.includes('study') ||
    context.template.content.includes('width="1536"') ||
    context.template.content.includes('viewBox="0 0 1536 1024"') ||
    input.templateId?.includes('study') === true ||
    input.range !== undefined;

  // Dynamically select Podium layout (<= 11) or Extended table layout (> 11)
  let templateContent = context.template.content;
  let isExtended = false;
  if (isStudy) {
    const startPos =
      input.range?.startPosition !== undefined && input.range.startPosition > 0
        ? input.range.startPosition
        : (input.entries[0]?.rank ?? 1);
    const layoutPref = input.render?.layout;
    if (layoutPref === 'list') {
      isExtended = true;
    } else if (layoutPref === 'podium_and_list') {
      isExtended = false;
    } else {
      isExtended = startPos > 11 || (input.entries.length > 0 && input.entries.every((e) => e.rank > 11));
    }

    if (isExtended) {
      const extTemplate = (await import('../../core/templates/template-registry.js')).templateRegistry.get('study-leaderboard');
      if (extTemplate) {
        templateContent = extTemplate.content;
      }
    } else {
      const podiumTemplate = (await import('../../core/templates/template-registry.js')).templateRegistry.get('study-leaderboard-2');
      if (podiumTemplate) {
        templateContent = podiumTemplate.content;
      }
    }
  }

  const avatarMap: LeaderboardAvatarMap = {};

  // Fetch & process avatars for entries that supply avatarUrl (with 25MB LRU memory cache)
  const avatarPromises = input.entries
    .filter((entry) => Boolean(entry.avatarUrl))
    .map(async (entry) => {
      try {
        const diameter = isStudy
          ? (isExtended ? 76 : (entry.rank <= 3 ? 160 : 72))
          : (entry.rank === 1 ? 120 : 80);
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
    return mapVoiceLeaderboardData(templateContent, input, avatarMap);
  });

  // Rasterize
  const scale = input.render?.scale ?? context.options?.dimensions?.scale ?? 1;
  const defaultWidth = isStudy
    ? voiceLeaderboardConfig.studyDimensions.width
    : voiceLeaderboardConfig.dimensions.width;
  const baseWidth =
    isStudy && context.options?.dimensions?.width === voiceLeaderboardConfig.dimensions.width
      ? defaultWidth
      : (context.options?.dimensions?.width ?? defaultWidth);
  const width = Math.round(baseWidth * scale);
  const background = context.options?.background ?? 'rgba(0,0,0,0)';

  return await context.measureStage('resvg_rasterization', async () => {
    return await SvgRenderer.renderToPngAsync({
      svgContent: dynamicSvg,
      width,
      background,
    });
  });
}
