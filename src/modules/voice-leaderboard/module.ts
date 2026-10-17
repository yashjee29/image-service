import type { ImageModule, RenderContext } from '../../core/renderer/renderer.types.js';
import { ValidationError } from '../../utils/errors.js';
import { voiceLeaderboardConfig } from './config.js';
import { renderVoiceLeaderboard } from './renderer.js';
import { VoiceLeaderboardInputSchema, type VoiceLeaderboardInput } from './schema.js';

export class VoiceLeaderboardModule implements ImageModule<VoiceLeaderboardInput> {
  public readonly id = voiceLeaderboardConfig.id;
  public readonly version = voiceLeaderboardConfig.version;
  public readonly description = voiceLeaderboardConfig.description;
  public readonly defaultDimensions = voiceLeaderboardConfig.dimensions;

  public validate(input: unknown): VoiceLeaderboardInput {
    const result = VoiceLeaderboardInputSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Voice leaderboard validation failed', result.error.format());
    }
    return result.data;
  }

  public async render(input: VoiceLeaderboardInput, context: RenderContext): Promise<Buffer> {
    return renderVoiceLeaderboard(input, context);
  }
}

export const voiceLeaderboardModule = new VoiceLeaderboardModule();
