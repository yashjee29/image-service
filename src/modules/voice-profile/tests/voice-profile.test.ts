import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import { voiceProfileModule } from '../index.js';
import { createRenderContext } from '../../../core/renderer/renderer.factory.js';
import { templateRegistry } from '../../../core/templates/template-registry.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('VoiceProfileModule', () => {
  beforeAll(() => {
    const templatePath = resolve(__dirname, '../templates/profile.svg');
    templateRegistry.register(voiceProfileModule.id, templatePath);
  });

  it('has expected module id, version, and dimensions', () => {
    expect(voiceProfileModule.id).toBe('voice-profile');
    expect(voiceProfileModule.version).toBe('1.0.0');
    expect(voiceProfileModule.defaultDimensions).toEqual({ width: 1200, height: 835 });
  });

  it('renders a valid PNG buffer directly from module without disk I/O', async () => {
    const input = voiceProfileModule.validate({
      username: 'TestUser',
      bio: 'Testing profile module directly',
      achievements: 20,
      goals: 10,
      milestones: 5,
    });

    const context = createRenderContext(voiceProfileModule.id);
    const pngBuffer = await voiceProfileModule.render(input, context);

    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
    expect(pngBuffer.length).toBeGreaterThan(10000);

    const meta = await sharp(pngBuffer).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(835);
    expect(meta.format).toBe('png');
  });
});
