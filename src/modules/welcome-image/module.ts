import type { ImageModule, RenderContext } from '../../core/renderer/renderer.types.js';
import { ValidationError } from '../../utils/errors.js';
import { welcomeImageConfig } from './config.js';
import { renderWelcomeImage } from './renderer.js';
import { WelcomeImageInputSchema, type WelcomeImageInput } from './schema.js';

export class WelcomeImageModule implements ImageModule<WelcomeImageInput> {
  public readonly id = welcomeImageConfig.id;
  public readonly version = welcomeImageConfig.version;
  public readonly description = welcomeImageConfig.description;
  public readonly defaultDimensions = welcomeImageConfig.dimensions;

  public validate(input: unknown): WelcomeImageInput {
    const result = WelcomeImageInputSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Welcome image validation failed', result.error.format());
    }
    return result.data;
  }

  public async render(input: WelcomeImageInput, context: RenderContext): Promise<Buffer> {
    return renderWelcomeImage(input, context);
  }
}

export const welcomeImageModule = new WelcomeImageModule();
