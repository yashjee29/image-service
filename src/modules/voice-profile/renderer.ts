import { SvgRenderer } from '../../core/renderer/svg-renderer.js';
import type { RenderContext } from '../../core/renderer/renderer.types.js';
import { avatarCache } from '../../core/images/avatar-cache.js';
import { mapVoiceProfileData } from './data-mapper.js';
import type { VoiceProfileInput } from './schema.js';
import { voiceProfileConfig } from './config.js';

export async function renderVoiceProfile(
  input: VoiceProfileInput,
  context: RenderContext
): Promise<Buffer> {
  let avatarDataUri: string | undefined;

  // 1. Fetch & process avatar if URL provided (with 25MB LRU memory cache)
  if (input.avatarUrl) {
    avatarDataUri = await context.measureStage('avatar_retrieval', async () => {
      return await avatarCache.getAvatarDataUri(
        input.avatarUrl!,
        voiceProfileConfig.avatar.processWidth
      );
    });
  }

  // 2. Inject dynamic data into template
  const dynamicSvg = await context.measureStage('svg_data_injection', () => {
    return mapVoiceProfileData(context.template.content, input, avatarDataUri);
  });

  // 3. Rasterize using Resvg
  const width = context.options?.dimensions?.width ?? voiceProfileConfig.dimensions.width;
  const background = context.options?.background ?? 'rgba(0,0,0,0)';

  return await context.measureStage('resvg_rasterization', () => {
    return SvgRenderer.renderToPng({
      svgContent: dynamicSvg,
      width,
      background,
    });
  });
}
