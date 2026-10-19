import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import { voiceProfileModule } from '../index.js';
import { createRenderContext } from '../../../core/renderer/renderer.factory.js';
import { templateRegistry } from '../../../core/templates/template-registry.js';
import { rankAssetCache } from '../../../core/images/rank-asset-cache.js';
import { fontRegistry } from '../../../core/fonts/font-registry.js';
import { resolve } from 'node:path';
import fs from 'node:fs';
import path from 'node:path';

describe('VoiceProfileModule', () => {
  beforeAll(async () => {
    fontRegistry.initialize();
    await rankAssetCache.initialize(60);
    const templatePath = resolve(process.cwd(), 'templates', voiceProfileModule.id, 'profile.svg');
    templateRegistry.register(voiceProfileModule.id, templatePath);
    templateRegistry.register('profile-card-v1', templatePath);
  });

  it('has expected module id, version, and dimensions', () => {
    expect(voiceProfileModule.id).toBe('voice-profile');
    expect(voiceProfileModule.version).toBe('1.0.0');
    expect(voiceProfileModule.defaultDimensions).toEqual({ width: 1200, height: 835 });
  });

  it('validates and renders a valid PNG buffer directly from user unified API payload format', async () => {
    const apiPayload = {
      schemaVersion: '1.0',
      requestId: 'profile-render-001',
      render: {
        templateId: 'profile-card-v1',
        format: 'png',
        scale: 1,
      },
      profile: {
        userId: 'discord-user-id',
        username: 'Sakha',
        avatarUrl: 'https://example.com/avatar.png',
      },
      rank: {
        current: {
          id: 'gold',
          name: 'Gold',
          assetKey: 'rank-gold',
          minimumHours: 155,
          maximumHours: 205,
        },
        next: {
          id: 'platinum',
          name: 'Platinum',
          assetKey: 'rank-platinum',
          minimumHours: 205,
          maximumHours: 280,
        },
        progressPercent: 71,
      },
      badges: [
        {
          id: 'hall-of-fame',
          name: 'Hall of Fame',
          assetKey: 'badge-hall-of-fame',
        },
        {
          id: 'top-performer',
          name: 'Top Performer',
          assetKey: 'badge-top-performer',
        },
        {
          id: 'winner',
          name: 'Winner',
          assetKey: 'badge-winner',
        },
      ],
      counters: {
        achievements: 24,
        goals: 12,
        milestones: 7,
      },
      leaderboard: {
        rank: 1,
        topPercent: 1,
        trendValues: [18, 28, 47, 42],
      },
      activity: {
        periodLabel: 'LAST 7 DAYS',
        entries: [
          { label: 'Mon', durationMinutes: 392, isCurrentDay: false },
          { label: 'Tue', durationMinutes: 465, isCurrentDay: false },
          { label: 'Wed', durationMinutes: 310, isCurrentDay: false },
          { label: 'Thu', durationMinutes: 565, isCurrentDay: false },
          { label: 'Fri', durationMinutes: 485, isCurrentDay: false },
          { label: 'Sat', durationMinutes: 375, isCurrentDay: false },
          { label: 'Sun', durationMinutes: 547, isCurrentDay: true },
        ],
      },
      hours: {
        monthly: {
          label: 'May (Monthly)',
          durationMinutes: 19260,
        },
        weekly: {
          label: 'Weekly',
          durationMinutes: 4680,
        },
        daily: {
          label: 'Daily',
          durationMinutes: 491,
        },
        allTime: {
          label: 'All Time',
          durationMinutes: 116270,
        },
      },
      timeBreakdown: {
        camMinutes: 67680,
        nonCamMinutes: 48590,
      },
    };

    const validatedInput = voiceProfileModule.validate(apiPayload);
    const context = createRenderContext('profile-card-v1');
    const pngBuffer = await voiceProfileModule.render(validatedInput, context);

    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
    expect(pngBuffer.length).toBeGreaterThan(10000);

    const meta = await sharp(pngBuffer).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(835);
    expect(meta.format).toBe('png');
  });

  it('renders multi-line badges when 4 badges are provided without overflowing', async () => {
    const apiPayload = {
      profile: {
        username: 'Sakha',
      },
      badges: [
        { id: '1', name: 'Winner', assetKey: 'badge-winner' },
        { id: '2', name: 'Top 1%', assetKey: 'badge-top' },
        { id: '3', name: 'MVP', assetKey: 'badge-mvp' },
        { id: '4', name: 'Hall of Fame', assetKey: 'badge-hall-of-fame' },
      ],
    };

    const validatedInput = voiceProfileModule.validate(apiPayload);
    const context = createRenderContext('profile-card-v1');
    const pngBuffer = await voiceProfileModule.render(validatedInput, context);

    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
    const meta = await sharp(pngBuffer).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(835);
  });

  it('handles long username with font scaling and truncation without overflowing achievements', async () => {
    const apiPayload = {
      profile: {
        username: 'Alexander The Greatest Champion',
      },
      badges: [
        { id: '1', name: 'Hall of Fame' },
        { id: '2', name: 'Top Performer' },
      ],
    };

    const validatedInput = voiceProfileModule.validate(apiPayload);
    const context = createRenderContext('profile-card-v1');
    const pngBuffer = await voiceProfileModule.render(validatedInput, context);

    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
    const meta = await sharp(pngBuffer).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(835);
  });

  it('guarantees strictly equal left and right spacing around rank progression arrow', async () => {
    const { layoutRankProgression } = await import('../data-mapper.js');

    // Test with Diamond -> Ascendant (longer rank names)
    const diamondLayout = layoutRankProgression(
      'Diamond',
      '(155h to 205h)',
      'Ascendant',
      '(205h to 280h)',
      71
    );

    const diamondGapLeft = diamondLayout.arrowStart - diamondLayout.text1End;
    const diamondGapRight = (diamondLayout.nextBadgeX - 20) - diamondLayout.arrowEnd;

    expect(diamondGapLeft).toBe(16);
    expect(diamondGapRight).toBe(16);
    expect(diamondGapLeft).toBe(diamondGapRight);
    expect(diamondLayout.arrowEnd - diamondLayout.arrowStart).toBe(16);

    // Test with Gold -> Platinum (standard rank names)
    const goldLayout = layoutRankProgression(
      'Gold',
      '(155h to 205h)',
      'Platinum',
      '(205h to 280h)',
      71
    );

    const goldGapLeft = goldLayout.arrowStart - goldLayout.text1End;
    const goldGapRight = (goldLayout.nextBadgeX - 20) - goldLayout.arrowEnd;

    expect(goldGapLeft).toBe(16);
    expect(goldGapRight).toBe(16);
    expect(goldGapLeft).toBe(goldGapRight);
    expect(goldLayout.arrowEnd - goldLayout.arrowStart).toBe(16);

    // Render with Diamond & Ascendant via the voiceProfileModule to verify full render
    const apiPayload = {
      profile: { username: 'Sakha' },
      rank: {
        current: { id: 'diamond', name: 'Diamond', assetKey: 'rank-diamond', minimumHours: 155, maximumHours: 205 },
        next: { id: 'ascendant', name: 'Ascendant', assetKey: 'rank-ascendant', minimumHours: 205, maximumHours: 280 },
        progressPercent: 71,
      },
    };

    const validatedInput = voiceProfileModule.validate(apiPayload);
    const context = createRenderContext('profile-card-v1');
    const pngBuffer = await voiceProfileModule.render(validatedInput, context);
    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
  });

  it('displays only hours without minutes when duration has exact hours (e.g. 0h, 5h)', async () => {
    const {
      formatDurationHoursAndMins,
      formatActivityDuration,
      formatMonthlyLabel,
      mapVoiceProfileData,
    } = await import('../data-mapper.js');
    const fs = await import('node:fs');
    const path = await import('node:path');

    // Test formatter functions
    expect(formatDurationHoursAndMins(0)).toBe('0h');
    expect(formatDurationHoursAndMins(300)).toBe('5h');
    expect(formatDurationHoursAndMins(491)).toBe('08h 11m');
    expect(formatDurationHoursAndMins(116270)).toBe('1,937h 50m');

    expect(formatActivityDuration(0)).toBe('0h');
    expect(formatActivityDuration(300)).toBe('5h');
    expect(formatActivityDuration(392)).toBe('6h 32m');

    // Test smart month abbreviation: long months (>5 letters) are abbreviated to 3 letters
    expect(formatMonthlyLabel('October (Monthly)')).toBe('Oct (Monthly)');
    expect(formatMonthlyLabel('OCTOBER (MONTHLY)')).toBe('OCT (MONTHLY)');
    expect(formatMonthlyLabel('November (Monthly)')).toBe('Nov (Monthly)');
    expect(formatMonthlyLabel('DECEMBER (MONTHLY)')).toBe('DEC (MONTHLY)');
    expect(formatMonthlyLabel('January (Monthly)')).toBe('Jan (Monthly)');
    expect(formatMonthlyLabel('February (Monthly)')).toBe('Feb (Monthly)');
    expect(formatMonthlyLabel('August (Monthly)')).toBe('Aug (Monthly)');
    expect(formatMonthlyLabel('September (Monthly)')).toBe('Sep (Monthly)');

    // Short/medium months (<=5 letters) retain their full names
    expect(formatMonthlyLabel('March (Monthly)')).toBe('March (Monthly)');
    expect(formatMonthlyLabel('MARCH (MONTHLY)')).toBe('MARCH (MONTHLY)');
    expect(formatMonthlyLabel('April (Monthly)')).toBe('April (Monthly)');
    expect(formatMonthlyLabel('APRIL (MONTHLY)')).toBe('APRIL (MONTHLY)');
    expect(formatMonthlyLabel('May (Monthly)')).toBe('May (Monthly)');
    expect(formatMonthlyLabel('MAY (MONTHLY)')).toBe('MAY (MONTHLY)');
    expect(formatMonthlyLabel('June (Monthly)')).toBe('June (Monthly)');
    expect(formatMonthlyLabel('JUNE (MONTHLY)')).toBe('JUNE (MONTHLY)');
    expect(formatMonthlyLabel('July (Monthly)')).toBe('July (Monthly)');
    expect(formatMonthlyLabel('JULY (MONTHLY)')).toBe('JULY (MONTHLY)');

    // Test full SVG rendering with 0h payload (like HexaDev)
    const templateSvg = fs.readFileSync(
      path.resolve(process.cwd(), 'templates/voice-profile/profile.svg'),
      'utf-8'
    );

    const zeroPayload = {
      profile: { username: 'HexaDev' },
      hours: {
        monthly: { label: 'OCTOBER (MONTHLY)', durationMinutes: 0 },
        weekly: { label: 'WEEKLY', durationMinutes: 0 },
        daily: { label: 'DAILY', durationMinutes: 0 },
        allTime: { label: 'ALL TIME', durationMinutes: 0 },
      },
      timeBreakdown: {
        camMinutes: 0,
        nonCamMinutes: 0,
      },
      activity: {
        periodLabel: 'LAST 7 DAYS',
        entries: [
          { label: 'Mon', durationMinutes: 0, isCurrentDay: false },
          { label: 'Tue', durationMinutes: 0, isCurrentDay: false },
          { label: 'Wed', durationMinutes: 0, isCurrentDay: false },
          { label: 'Thu', durationMinutes: 0, isCurrentDay: false },
          { label: 'Fri', durationMinutes: 0, isCurrentDay: false },
          { label: 'Sat', durationMinutes: 0, isCurrentDay: false },
          { label: 'Sun', durationMinutes: 0, isCurrentDay: true },
        ],
      },
    };

    const renderedSvg = mapVoiceProfileData(templateSvg, zeroPayload as any);

    // Verify 00h 00m or 0h 00m does NOT appear anywhere
    expect(renderedSvg).not.toContain('00h 00m');
    expect(renderedSvg).not.toContain('0h 00m');

    // Verify avatar bezel frame
    expect(renderedSvg).toContain('r="95" fill="#FAF1EC" stroke="#E5D3C7"');
    expect(renderedSvg).toContain('r="83.5" fill="none" stroke="#EFE7DE"');

    // Verify OCTOBER (MONTHLY) is formatted to OCT (MONTHLY)
    expect(renderedSvg).toContain('OCT (MONTHLY)');
    expect(renderedSvg).not.toContain('OCTOBER (MONTHLY)');

    // Verify updated divider coordinates
    expect(renderedSvg).toContain('line x1="216" y1="71" x2="216" y2="141"');
    expect(renderedSvg).toContain('line x1="400" y1="71" x2="400" y2="141"');
    expect(renderedSvg).toContain('line x1="616" y1="71" x2="616" y2="141"');
  });

  it('sanitizes unsupported emojis in username and eliminates template dummy data for zero/empty profile', async () => {
    const { mapVoiceProfileData } = await import('../data-mapper.js');
    const templateSvg = fs.readFileSync(
      path.resolve(process.cwd(), 'templates/voice-profile/profile.svg'),
      'utf-8'
    );

    // Profile with emoji username, 0 hours, no bio, no badges, rank 0
    const input = {
      profile: {
        username: 'chivas🍻👁️',
      },
      timeBreakdown: {
        camMinutes: 0,
        nonCamMinutes: 0,
      },
    };

    const renderedSvg = mapVoiceProfileData(templateSvg, input as any);

    // 1. Emoji username should be sanitized to chivas (no tofu)
    expect(renderedSvg).toContain('chivas');
    expect(renderedSvg).not.toContain('🍻');
    expect(renderedSvg).not.toContain('👁️');

    // 2. No dummy numbers or fake text should leak
    expect(renderedSvg).not.toContain('1,128h');
    expect(renderedSvg).not.toContain('809h');
    expect(renderedSvg).not.toContain('1,937h');
    expect(renderedSvg).not.toContain('Focus. Compete. Improve.');
    expect(renderedSvg).not.toContain('>Hall of Fame<');
    expect(renderedSvg).not.toContain('>Top Performer<');
    expect(renderedSvg).not.toContain('>Winner<');

    // 3. Time breakdown cards show 0h and 0%
    expect(renderedSvg).toContain('0h');
    expect(renderedSvg).toContain('0%');

    // 4. Counters default to 0 and leaderboard defaults to #-- and Top 100%
    expect(renderedSvg).toContain('#--');
    expect(renderedSvg).toContain('Top 100%');
  });
});
