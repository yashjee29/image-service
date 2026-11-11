import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import { resolve } from 'node:path';
import { welcomeImageModule, fitWelcomeUsername, mapWelcomeImageData } from '../index.js';
import { createRenderContext } from '../../../core/renderer/renderer.factory.js';
import { templateRegistry } from '../../../core/templates/template-registry.js';
import { fontRegistry } from '../../../core/fonts/font-registry.js';

describe('WelcomeImageModule', () => {
  beforeAll(async () => {
    fontRegistry.initialize();
    const templatePath = resolve(process.cwd(), 'templates', 'welcome-image', 'welcome-image.svg');
    templateRegistry.register(welcomeImageModule.id, templatePath);
    templateRegistry.register('welcome', templatePath);
    templateRegistry.register('welcome-card', templatePath);
    templateRegistry.register('welcome-image-v1', templatePath);
  });

  it('has expected module id, version, and dimensions', () => {
    expect(welcomeImageModule.id).toBe('welcome-image');
    expect(welcomeImageModule.version).toBe('1.0.0');
    expect(welcomeImageModule.defaultDimensions).toEqual({ width: 1320, height: 570 });
  });

  describe('fitWelcomeUsername', () => {
    it('keeps equal font size (73) for normal short usernames', () => {
      const res = fitWelcomeUsername('Aarav');
      expect(res.displayName).toBe('Aarav');
      expect(res.fontSize).toBe(73);
      expect(res.isTruncated).toBe(false);
    });

    it('keeps text font equal (73) and truncates with "..." when username is too long', () => {
      const res = fitWelcomeUsername('Christopher');
      expect(res.displayName.endsWith('...')).toBe(true);
      expect(res.fontSize).toBe(73);
      expect(res.isTruncated).toBe(true);
      expect(res.width).toBeLessThanOrEqual(295);
    });

    it('keeps text font equal (73) and truncates with "..." for names like Alexander', () => {
      const res = fitWelcomeUsername('Alexander');
      expect(res.displayName.endsWith('...')).toBe(true);
      expect(res.fontSize).toBe(73);
      expect(res.isTruncated).toBe(true);
      expect(res.width).toBeLessThanOrEqual(295);
    });

    it('keeps text font equal (73) and truncates with "..." when username is too much long', () => {
      const res = fitWelcomeUsername('AlexanderTheGreatestWarrior');
      expect(res.displayName.endsWith('...')).toBe(true);
      expect(res.isTruncated).toBe(true);
      expect(res.fontSize).toBe(73);
      expect(res.width).toBeLessThanOrEqual(295);
    });

    it('truncates very long usernames with many wide characters keeping font equal (73)', () => {
      const res = fitWelcomeUsername('WWWWWWWWWWWWWWWWWWWW');
      expect(res.displayName.endsWith('...')).toBe(true);
      expect(res.isTruncated).toBe(true);
      expect(res.fontSize).toBe(73);
      expect(res.width).toBeLessThanOrEqual(295);
    });

    it('sanitizes and strips dangerous emojis or unsupported glyphs', () => {
      const res = fitWelcomeUsername('Sam🚀🔥');
      expect(res.displayName).toBe('Sam');
      expect(res.fontSize).toBe(73);
    });
  });

  describe('mapWelcomeImageData', () => {
    it('replaces username in svg template with fitted font-size and escaped text', () => {
      const template = templateRegistry.get('welcome-image')!.content;
      const mapped = mapWelcomeImageData(template, { username: 'Vikram' });
      expect(mapped).toContain('Vikram');
      expect(mapped).not.toContain('>Aarav!<');
    });

    it('escapes XML special characters in username', () => {
      const template = templateRegistry.get('welcome-image')!.content;
      const mapped = mapWelcomeImageData(template, { username: 'A & <B>' });
      expect(mapped).toContain('A &amp; &lt;B&gt;');
    });

    it('injects custom avatar image when data URI provided', () => {
      const template = templateRegistry.get('welcome-image')!.content;
      const fakeDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mapped = mapWelcomeImageData(template, { username: 'Rohan' }, fakeDataUri);
      expect(mapped).toContain(fakeDataUri);
      expect(mapped).toContain('clip-path="url(#avatarClip)"');
    });

    it('preserves default vector character illustration when no avatar data URI is provided', () => {
      const template = templateRegistry.get('welcome-image')!.content;
      const mapped = mapWelcomeImageData(template, { username: 'Rohan' });
      expect(mapped).toContain('id="avatarClip"');
      expect(mapped).toContain('avatarSky');
    });

    it('positions accent rays dynamically on both X and Y axis for very long names', () => {
      const template = templateRegistry.get('welcome-image')!.content;
      const mapped = mapWelcomeImageData(template, { username: 'VeryVeryLongUsernameThatOverflows' });
      expect(mapped).toContain('id="accentRays" transform="translate(');
      expect(mapped).toContain('scale(');
    });

    it('omits accent rays only when explicitly disabled via showAccentRays: false', () => {
      const template = templateRegistry.get('welcome-image')!.content;
      const mapped = mapWelcomeImageData(template, { username: 'Aarav', showAccentRays: false });
      expect(mapped).toContain('3 Yellow Accent Rays omitted');
    });

    it('positions accent rays dynamically when username is short', () => {
      const template = templateRegistry.get('welcome-image')!.content;
      const mapped = mapWelcomeImageData(template, { username: 'Bo' });
      expect(mapped).toContain('id="accentRays" transform="translate(');
    });

    it('customizes greeting and badge text if provided', () => {
      const template = templateRegistry.get('welcome-image')!.content;
      const mapped = mapWelcomeImageData(template, {
        username: 'Aarav',
        greeting: 'Hello & Welcome,',
        badgeText: 'New Student on Board!',
      });
      expect(mapped).toContain('Hello &amp; Welcome,');
      expect(mapped).toContain('New Student on Board!');
    });
  });

  describe('render', () => {
    it('validates and renders a valid PNG buffer directly from payload', async () => {
      const context = createRenderContext('welcome-image');
      const pngBuffer = await welcomeImageModule.render(
        {
          username: 'Yash',
          badgeText: 'Glad to have you here!',
        },
        context
      );

      expect(Buffer.isBuffer(pngBuffer)).toBe(true);
      expect(pngBuffer.length).toBeGreaterThan(10000);

      const metadata = await sharp(pngBuffer).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(1320);
      expect(metadata.height).toBe(570);
    });

    it('renders with scaling factor (2x)', async () => {
      const context = createRenderContext('welcome-image', {
        dimensions: { width: 2640, scale: 2 },
      });
      const pngBuffer = await welcomeImageModule.render(
        {
          username: 'ScaleUser',
          render: { scale: 2 },
        },
        context
      );

      const metadata = await sharp(pngBuffer).metadata();
      expect(metadata.width).toBe(2640);
      expect(metadata.height).toBe(1140);
    });

    it('renders truncated name for very long username', async () => {
      const context = createRenderContext('welcome-image');
      const pngBuffer = await welcomeImageModule.render(
        {
          username: 'Supercalifragilisticexpialidocious',
        },
        context
      );

      expect(Buffer.isBuffer(pngBuffer)).toBe(true);
      const metadata = await sharp(pngBuffer).metadata();
      expect(metadata.width).toBe(1320);
      expect(metadata.height).toBe(570);
    });

    it('renders with custom avatar data URI', async () => {
      const fakeDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const context = createRenderContext('welcome-image');
      const pngBuffer = await welcomeImageModule.render(
        {
          username: 'CustomAvatar',
          avatarDataUri: fakeDataUri,
        },
        context
      );

      expect(Buffer.isBuffer(pngBuffer)).toBe(true);
      const metadata = await sharp(pngBuffer).metadata();
      expect(metadata.width).toBe(1320);
      expect(metadata.height).toBe(570);
    });
  });
});
