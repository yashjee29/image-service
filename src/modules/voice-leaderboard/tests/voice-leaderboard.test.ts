import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import { voiceLeaderboardModule } from '../index.js';
import { createRenderContext } from '../../../core/renderer/renderer.factory.js';
import { templateRegistry } from '../../../core/templates/template-registry.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('VoiceLeaderboardModule', () => {
  beforeAll(() => {
    const templatePath = resolve(__dirname, '../templates/leaderboard.svg');
    templateRegistry.register(voiceLeaderboardModule.id, templatePath);
  });

  it('has expected module id, version, and dimensions', () => {
    expect(voiceLeaderboardModule.id).toBe('voice-leaderboard');
    expect(voiceLeaderboardModule.version).toBe('1.0.0');
    expect(voiceLeaderboardModule.defaultDimensions).toEqual({ width: 1200, height: 835 });
  });

  it('renders a valid PNG buffer directly for leaderboard entries', async () => {
    const input = voiceLeaderboardModule.validate({
      title: 'TOP VOICE CHAMPIONS',
      period: 'WEEK 42',
      entries: [
        { rank: 1, username: 'PlayerOne', hours: '50h 10m' },
        { rank: 2, username: 'PlayerTwo', hours: '42h 00m' },
        { rank: 3, username: 'PlayerThree', hours: '35h 20m' },
        { rank: 4, username: 'PlayerFour', hours: '28h 15m' },
        { rank: 5, username: 'PlayerFive', hours: '20h 00m' },
      ],
    });

    const context = createRenderContext(voiceLeaderboardModule.id);
    const pngBuffer = await voiceLeaderboardModule.render(input, context);

    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
    expect(pngBuffer.length).toBeGreaterThan(10000);

    const meta = await sharp(pngBuffer).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(835);
    expect(meta.format).toBe('png');
  });
});
