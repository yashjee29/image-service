import type { ImageModule, RenderContext } from '../../core/renderer/renderer.types.js';
import { ValidationError } from '../../utils/errors.js';
import { voiceProfileConfig } from './config.js';
import { renderVoiceProfile } from './renderer.js';
import { VoiceProfileInputSchema, type VoiceProfileInput } from './schema.js';

export class VoiceProfileModule implements ImageModule<VoiceProfileInput> {
  public readonly id = voiceProfileConfig.id;
  public readonly version = voiceProfileConfig.version;
  public readonly description = voiceProfileConfig.description;
  public readonly defaultDimensions = voiceProfileConfig.dimensions;

  public validate(input: unknown): VoiceProfileInput {
    const result = VoiceProfileInputSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Voice profile validation failed', result.error.format());
    }
    return result.data;
  }

  public async render(input: VoiceProfileInput, context: RenderContext): Promise<Buffer> {
    return renderVoiceProfile(input, context);
  }
}

export const voiceProfileModule = new VoiceProfileModule();
