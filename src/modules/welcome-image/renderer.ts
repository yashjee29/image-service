import { SvgRenderer } from '../../core/renderer/svg-renderer.js';
import type { RenderContext } from '../../core/renderer/renderer.types.js';
import { avatarCache } from '../../core/images/avatar-cache.js';
import { mapWelcomeImageData } from './data-mapper.js';
import type { WelcomeImageInput } from './schema.js';
import { welcomeImageConfig } from './config.js';

export async function renderWelcomeImage(
  input: WelcomeImageInput,
  context: RenderContext
): Promise<Buffer> {
  let avatarDataUri: string | undefined = input.avatarDataUri;

  // 1. Fetch & process avatar if URL provided (with LRU memory cache)
  const avatarUrl =
    input.avatarUrl ??
    input.avatar ??
    input.profile?.avatarUrl ??
    input.profile?.avatar ??
    input.user?.avatarUrl ??
    input.user?.avatar;

  if (!avatarDataUri && avatarUrl) {
    if (avatarUrl.startsWith('data:')) {
      avatarDataUri = avatarUrl;
    } else {
      try {
        avatarDataUri = await context.measureStage('avatar_retrieval', async () => {
          return await avatarCache.getAvatarDataUri(
            avatarUrl,
            welcomeImageConfig.avatar.processWidth
          );
        });
      } catch {
        // Gracefully continue with template default illustration if remote fetch fails
      }
    }
  }

  // 2. Inject dynamic data into template
  const dynamicSvg = await context.measureStage('svg_data_injection', () => {
    return mapWelcomeImageData(context.template.content, input, avatarDataUri);
  });

  // 3. Rasterize using Resvg
  const scale = input.render?.scale ?? context.options?.dimensions?.scale ?? 1;
  const width =
    context.options?.dimensions?.width !== undefined
      ? context.options.dimensions.width
      : Math.round(welcomeImageConfig.dimensions.width * scale);
  const background = context.options?.background ?? 'rgba(0,0,0,0)';

  return await context.measureStage('resvg_rasterization', async () => {
    return await SvgRenderer.renderToPngAsync({
      svgContent: dynamicSvg,
      width,
      background,
    });
  });
}
