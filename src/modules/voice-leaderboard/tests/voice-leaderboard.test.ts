import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import { voiceLeaderboardModule } from '../index.js';
import { createRenderContext } from '../../../core/renderer/renderer.factory.js';
import { templateRegistry } from '../../../core/templates/template-registry.js';
import { fontRegistry } from '../../../core/fonts/font-registry.js';
import { resolve } from 'node:path';

describe('VoiceLeaderboardModule', () => {
  beforeAll(() => {
    fontRegistry.initialize();
    const templatePath = resolve(process.cwd(), 'templates', voiceLeaderboardModule.id, 'leaderboard.svg');
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

  it('registers and renders study-leaderboard template with transparent background', async () => {
    const template = templateRegistry.get('study-leaderboard');
    expect(template).toBeDefined();
    expect(template?.content).not.toContain('<rect x="0" y="0" width="1536" height="1024"');
    expect(template?.content).toContain('data:image/png;base64');

    // Render directly to verify transparency at corners
    const pngBuffer = await sharp(Buffer.from(template!.content)).png().toBuffer();
    const meta = await sharp(pngBuffer).metadata();
    expect(meta.width).toBe(1536);
    expect(meta.height).toBe(1024);
    expect(meta.hasAlpha).toBe(true);

    const { data } = await sharp(pngBuffer).raw().toBuffer({ resolveWithObject: true });
    // Check top-left corner (0,0) has alpha = 0 (transparent)
    expect(data[3]).toBe(0);
  });

  it('formats hours using the profile duration algorithm', async () => {
    const { formatLeaderboardHours } = await import('../data-mapper.js');
    expect(formatLeaderboardHours(300)).toBe('5h');
    expect(formatLeaderboardHours(0)).toBe('0h');
    expect(formatLeaderboardHours(491)).toBe('8h 11m');
    expect(formatLeaderboardHours(undefined, '0h 00m')).toBe('0h');
    expect(formatLeaderboardHours(undefined, '5h 00m')).toBe('5h');
    expect(formatLeaderboardHours(undefined, '5h 0m')).toBe('5h');
    expect(formatLeaderboardHours(undefined, '149h 00m')).toBe('149h');
    expect(formatLeaderboardHours(undefined, '8h 11m')).toBe('8h 11m');
  });

  it('formats monthly label correctly keeping short months full and abbreviating long months', async () => {
    const { formatMonthlyLabel } = await import('../data-mapper.js');
    expect(formatMonthlyLabel('November')).toBe('Nov');
    expect(formatMonthlyLabel('november')).toBe('Nov');
    expect(formatMonthlyLabel('nov')).toBe('Nov');
    expect(formatMonthlyLabel('DECEMBER')).toBe('DEC');
    expect(formatMonthlyLabel('december')).toBe('Dec');
    expect(formatMonthlyLabel('Monthly (October)')).toBe('Monthly (Oct)');
    expect(formatMonthlyLabel('March')).toBe('March');
    expect(formatMonthlyLabel('march')).toBe('March');
    expect(formatMonthlyLabel('May')).toBe('May');
    expect(formatMonthlyLabel('June')).toBe('June');
    expect(formatMonthlyLabel('July')).toBe('July');
  });

  it('renders different metric icons for cam, non-cam, and both/total without dropdown arrows', async () => {
    const { renderHeaderMetricIcon } = await import('../data-mapper.js');
    const camIcon = renderHeaderMetricIcon('CAM HOURS', 0, 0);
    expect(camIcon).toContain('metric-icon-cam');

    const nonCamIcon = renderHeaderMetricIcon('NON-CAM HOURS', 0, 0);
    expect(nonCamIcon).toContain('metric-icon-mic');

    const bothIcon = renderHeaderMetricIcon('TOTAL HOURS', 0, 0);
    expect(bothIcon).toContain('metric-icon-both');
  });

  it('renders study-leaderboard with rank icons, medals, and rank-specific text colors', async () => {
    const { rankAssetCache } = await import('../../../core/images/rank-asset-cache.js');
    const { leaderboardAssetCache } = await import('../../../core/images/leaderboard-asset-cache.js');
    await rankAssetCache.initialize();
    await leaderboardAssetCache.initialize();

    const input = voiceLeaderboardModule.validate({
      title: 'Top Students',
      period: 'November',
      category: 'CAM HOURS',
      entries: [
        { rank: 1, username: 'AlphaOne', durationMinutes: 300, rankId: 'radiant' },
        { rank: 2, username: 'BetaTwo', durationMinutes: 240, rankId: 'immortal' },
        { rank: 3, username: 'GammaThree', durationMinutes: 195, rankId: 'diamond' },
        { rank: 4, username: 'DeltaFour', durationMinutes: 180, rankId: 'platinum' },
        { rank: 5, username: 'EpsilonFive', durationMinutes: 160, rankId: 'gold' },
        { rank: 6, username: 'ZetaSix', durationMinutes: 140, rankId: 'ascendant' },
        { rank: 7, username: 'EtaSeven', durationMinutes: 120, rankId: 'silver' },
        { rank: 8, username: 'ThetaEight', durationMinutes: 100, rankId: 'bronze' },
        { rank: 9, username: 'IotaNine', durationMinutes: 80, rankId: 'iron' },
        { rank: 10, username: 'KappaTen', durationMinutes: 60, rankId: 'unrated' },
        { rank: 11, username: 'LambdaEleven', durationMinutes: 40, rankId: 'gold' },
      ],
    });

    const context = createRenderContext('study-leaderboard');
    const pngBuffer = await voiceLeaderboardModule.render(input, context);

    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
    const meta = await sharp(pngBuffer).metadata();
    expect(meta.width).toBe(1536);
    expect(meta.height).toBe(1024);
    expect(meta.hasAlpha).toBe(true);
  });

  it('correctly normalizes user dynamic JSON payload structure', () => {
    const rawPayload = {
      schemaVersion: '1.0',
      requestId: 'leaderboard-render-001',
      render: {
        templateId: 'study-leaderboard-v1',
        format: 'png',
        scale: 1,
      },
      filters: {
        period: 'monthly',
        metric: 'cam',
      },
      leaderboard: {
        range: {
          startPosition: 1,
          endPosition: 11,
        },
        totalParticipants: 25,
        entries: [
          {
            position: 1,
            userId: 'user-001',
            username: 'Aarav',
            durationMinutes: 19260,
            rank: {
              id: 'immortal',
              name: 'Immortal',
              assetKey: 'rank-immortal',
            },
          },
        ],
      },
    };

    const validated = voiceLeaderboardModule.validate(rawPayload);
    expect(validated.period).toBe('Monthly');
    expect(validated.category).toBe('CAM HOURS');
    expect(validated.startPosition).toBe(1);
    expect(validated.endPosition).toBe(11);
    expect(validated.totalParticipants).toBe(25);
    expect(validated.entries[0]!.rank).toBe(1);
    expect(validated.entries[0]!.username).toBe('Aarav');
    expect(validated.entries[0]!.rankId).toBe('immortal');
    expect(validated.entries[0]!.rankName).toBe('Immortal');
  });

  it('automatically selects podium template for ranks <= 11 and extended template for ranks > 11', async () => {
    const page1Input = voiceLeaderboardModule.validate({
      leaderboard: {
        range: { startPosition: 1, endPosition: 11 },
        entries: [
          { position: 1, username: 'Aarav', durationMinutes: 19260, rank: { id: 'immortal', name: 'Immortal' } },
        ],
      },
    });

    const context1 = createRenderContext('voice-leaderboard');
    const page1Buffer = await voiceLeaderboardModule.render(page1Input, context1);
    expect(Buffer.isBuffer(page1Buffer)).toBe(true);
    const meta1 = await sharp(page1Buffer).metadata();
    expect(meta1.width).toBe(1536);
    expect(meta1.height).toBe(1024);

    const page2Input = voiceLeaderboardModule.validate({
      leaderboard: {
        range: { startPosition: 12, endPosition: 25 },
        entries: [
          { position: 12, username: 'Riya', durationMinutes: 7080, rank: { id: 'platinum', name: 'Platinum' } },
          { position: 13, username: 'Aryan', durationMinutes: 6900, rank: { id: 'gold', name: 'Gold' } },
        ],
      },
    });

    const context2 = createRenderContext('voice-leaderboard');
    const page2Buffer = await voiceLeaderboardModule.render(page2Input, context2);
    expect(Buffer.isBuffer(page2Buffer)).toBe(true);
    const meta2 = await sharp(page2Buffer).metadata();
    expect(meta2.width).toBe(1536);
    expect(meta2.height).toBe(1024);
  });

  it('recognizes high-tier ranks for enlarged icons and prevents collision with hours', async () => {
    const { isHighTierRank } = await import('../config.js');
    expect(isHighTierRank('diamond')).toBe(true);
    expect(isHighTierRank('ascendant')).toBe(true);
    expect(isHighTierRank('immortal')).toBe(true);
    expect(isHighTierRank('radiant')).toBe(true);
    expect(isHighTierRank('gold')).toBe(false);
    expect(isHighTierRank('bronze')).toBe(false);
    expect(isHighTierRank('iron')).toBe(false);
    expect(isHighTierRank('unrated')).toBe(false);
  });

  it('correctly maps requesterUserId to isCurrentUser and applies warm aesthetic highlights and darker hours', async () => {
    const { mapStudyLeaderboardData } = await import('../data-mapper.js');
    const { REQUESTER_HIGHLIGHT_THEME, getRankTheme } = await import('../config.js');

    const rawPayload = {
      schemaVersion: '1.0',
      requestId: 'leaderboard-render-001',
      requestContext: {
        requesterUserId: 'user-002',
      },
      render: {
        templateId: 'study-leaderboard-v1',
        format: 'png',
        scale: 1,
        layout: 'podium_and_list',
        highlightRequester: true,
      },
      filters: {
        period: 'monthly',
        metric: 'cam',
      },
      leaderboard: {
        range: { startPosition: 1, endPosition: 11 },
        totalParticipants: 25,
        entries: [
          {
            position: 1,
            userId: 'user-001',
            username: 'Aarav',
            durationMinutes: 19260,
            rank: { id: 'immortal', name: 'Immortal' },
          },
          {
            position: 2,
            userId: 'user-002',
            username: 'Sakha',
            durationMinutes: 17040,
            rank: { id: 'ascendant', name: 'Ascendant' },
          },
          {
            position: 3,
            userId: 'user-003',
            username: 'Mira',
            durationMinutes: 15060,
            rank: { id: 'diamond', name: 'Diamond' },
          },
          {
            position: 5,
            userId: 'user-005',
            username: 'Kabir',
            durationMinutes: 12420,
            rank: { id: 'diamond', name: 'Diamond' },
          },
        ],
      },
    };

    const validated = voiceLeaderboardModule.validate(rawPayload);
    // User-002 (Sakha at rank 2) should be flagged as current user
    expect(validated.entries.find((e) => e.userId === 'user-002')?.isCurrentUser).toBe(true);
    expect(validated.entries.find((e) => e.userId === 'user-001')?.isCurrentUser).toBe(false);

    // Load template and map SVG
    const template = templateRegistry.get('study-leaderboard-2');
    expect(template).toBeDefined();

    const mappedSvg = mapStudyLeaderboardData(template!.content, validated);

    // Podium rank #2 top badge pill should have warm highlight fill and border
    expect(mappedSvg).toContain(`id="podium-top-pill-2" x="298.5" y="172" width="125" height="52" rx="19" fill="${REQUESTER_HIGHLIGHT_THEME.rankBoxBg}" stroke="${REQUESTER_HIGHLIGHT_THEME.rankBoxBorder}" stroke-width="${REQUESTER_HIGHLIGHT_THEME.rankBoxStrokeWidth}"`);
    // Podium rank #2 number should be bold 900 with warm terracotta color
    expect(mappedSvg).toContain(`id="podium-rank-num-2" x="381" y="208" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="29" font-weight="900" fill="${REQUESTER_HIGHLIGHT_THEME.rankNumColor}"`);
    // Username Sakha should be bold 900 with high contrast color
    expect(mappedSvg).toContain(`id="podium-user-2" x="363" y="440" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="33" font-weight="900" fill="${REQUESTER_HIGHLIGHT_THEME.nameColor}"`);
    // Study hours should be bold 900 with darker shade of Ascendant rank
    const ascendantTheme = getRankTheme('ascendant');
    expect(mappedSvg).toContain(`id="podium-hours-2" x="363" y="569" font-family="Nunito Sans, Nunito, Arial, sans-serif" font-size="47" font-weight="900" fill="${ascendantTheme.darkerColor}"`);
  });

  it('dynamically removes unused podium cards and empty bottom tables when entries < 3', async () => {
    const { mapStudyLeaderboardData } = await import('../data-mapper.js');
    const validated = voiceLeaderboardModule.validate({
      entries: [
        { rank: 1, username: 'Aarav', durationMinutes: 19260, rankId: 'immortal' },
      ],
    });

    const template = templateRegistry.get('study-leaderboard-2');
    expect(template).toBeDefined();

    const mappedSvg = mapStudyLeaderboardData(template!.content, validated);

    // Card 1 should exist
    expect(mappedSvg).toContain('id="podium-card-1"');
    expect(mappedSvg).toContain('Aarav');

    // Cards 2 and 3 should be removed completely
    expect(mappedSvg).not.toContain('id="podium-card-2"');
    expect(mappedSvg).not.toContain('id="podium-card-3"');
    expect(mappedSvg).not.toContain('Sakha');
    expect(mappedSvg).not.toContain('Mira');

    // Bottom tables and rows 4-11 should be removed
    expect(mappedSvg).not.toContain('id="study-table-col-1"');
    expect(mappedSvg).not.toContain('id="study-table-col-2"');
    expect(mappedSvg).not.toContain('id="study-row-4"');
    expect(mappedSvg).not.toContain('id="study-divider-4"');
  });

  it('dynamically hides right column container and adjusts height when entries < 8 on podium layout', async () => {
    const { mapStudyLeaderboardData } = await import('../data-mapper.js');
    const validated = voiceLeaderboardModule.validate({
      entries: [
        { rank: 1, username: 'Aarav', durationMinutes: 19260, rankId: 'immortal' },
        { rank: 2, username: 'Sakha', durationMinutes: 17040, rankId: 'ascendant' },
        { rank: 3, username: 'Mira', durationMinutes: 15060, rankId: 'diamond' },
        { rank: 4, username: 'PixelDreams', durationMinutes: 13680, rankId: 'diamond' },
        { rank: 5, username: 'Kabir', durationMinutes: 12420, rankId: 'diamond' },
      ],
    });

    const template = templateRegistry.get('study-leaderboard-2');
    const mappedSvg = mapStudyLeaderboardData(template!.content, validated);

    // Cards 1, 2, 3 exist
    expect(mappedSvg).toContain('id="podium-card-1"');
    expect(mappedSvg).toContain('id="podium-card-2"');
    expect(mappedSvg).toContain('id="podium-card-3"');

    // Col 1 container exists and is adjusted to 2 rows (height=169)
    expect(mappedSvg).toContain('id="study-table-col-1"');
    expect(mappedSvg).toContain('height="169"');
    expect(mappedSvg).toContain('id="study-row-4"');
    expect(mappedSvg).toContain('id="study-row-5"');
    expect(mappedSvg).toContain('id="study-divider-4"');

    // Unused rows in col 1 are removed
    expect(mappedSvg).not.toContain('id="study-row-6"');
    expect(mappedSvg).not.toContain('id="study-row-7"');
    expect(mappedSvg).not.toContain('id="study-divider-5"');

    // Col 2 container and rows 8-11 are completely removed
    expect(mappedSvg).not.toContain('id="study-table-col-2"');
    expect(mappedSvg).not.toContain('id="study-row-8"');
  });

  it('dynamically hides right column container and adjusts height on list design when entries < 8', async () => {
    const { mapExtendedStudyLeaderboardData } = await import('../data-mapper.js');
    const validated = voiceLeaderboardModule.validate({
      render: { layout: 'list' },
      entries: [
        { rank: 12, username: 'Riya', durationMinutes: 7080, rankId: 'platinum' },
        { rank: 13, username: 'Aryan', durationMinutes: 6900, rankId: 'gold' },
        { rank: 14, username: 'Meera', durationMinutes: 6720, rankId: 'gold' },
        { rank: 15, username: 'Rohit', durationMinutes: 6120, rankId: 'silver' },
        { rank: 16, username: 'Siya', durationMinutes: 5880, rankId: 'silver' },
      ],
    });

    const template = templateRegistry.get('study-leaderboard');
    const mappedSvg = mapExtendedStudyLeaderboardData(template!.content, validated);

    // Col 1 container exists with adjusted height for 5 rows (height=515)
    expect(mappedSvg).toContain('id="study-ext-table-col-1"');
    expect(mappedSvg).toContain('height="515"');
    expect(mappedSvg).toContain('id="study-ext-row-12"');
    expect(mappedSvg).toContain('id="study-ext-row-16"');
    expect(mappedSvg).toContain('id="study-ext-divider-15"');

    // Unused rows in col 1 are removed
    expect(mappedSvg).not.toContain('id="study-ext-row-17"');
    expect(mappedSvg).not.toContain('id="study-ext-row-18"');
    expect(mappedSvg).not.toContain('id="study-ext-divider-16"');

    // Col 2 container and rows 19-25 are completely removed
    expect(mappedSvg).not.toContain('id="study-ext-table-col-2"');
    expect(mappedSvg).not.toContain('id="study-ext-row-19"');
  });

  it('validates and renders an empty leaderboard with range 0-0 without throwing', async () => {
    const input = voiceLeaderboardModule.validate({
      range: { startPosition: 0, endPosition: 0 },
      leaderboard: {
        range: { startPosition: 0, endPosition: 0 },
        totalParticipants: 0,
        entries: [],
      },
    });

    expect(input.entries).toHaveLength(0);
    expect(input.range?.startPosition).toBe(0);
    expect(input.range?.endPosition).toBe(0);

    const context = createRenderContext('study-leaderboard-2');
    const pngBuffer = await voiceLeaderboardModule.render(input, context);

    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
    expect(pngBuffer.length).toBeGreaterThan(10000);

    const meta = await sharp(pngBuffer).metadata();
    expect(meta.width).toBe(1536);
    expect(meta.height).toBe(1024);
  });

  it('renders empty state graphic when entries array is empty for both podium and list layouts', async () => {
    const { mapStudyLeaderboardData, mapExtendedStudyLeaderboardData } = await import('../data-mapper.js');
    const validatedPodium = voiceLeaderboardModule.validate({
      render: { layout: 'podium_and_list' },
      entries: [],
    });
    const podiumTemplate = templateRegistry.get('study-leaderboard-2');
    const podiumSvg = mapStudyLeaderboardData(podiumTemplate!.content, validatedPodium);
    expect(podiumSvg).toContain('id="study-empty-state"');
    expect(podiumSvg).toContain('No Study Records Yet');
    expect(podiumSvg).not.toContain('id="podium-card-1"');

    const validatedList = voiceLeaderboardModule.validate({
      render: { layout: 'list' },
      entries: [],
    });
    const listTemplate = templateRegistry.get('study-leaderboard');
    const listSvg = mapExtendedStudyLeaderboardData(listTemplate!.content, validatedList);
    expect(listSvg).toContain('id="study-ext-empty-state"');
    expect(listSvg).toContain('No Users on this Page');
    expect(listSvg).not.toContain('id="study-ext-table-col-1"');
  });

  it('always displays "HALL OF FAME DECIDED BY CAM HOURS ONLY." in header regardless of metric filter', async () => {
    const { mapStudyLeaderboardData, mapExtendedStudyLeaderboardData } = await import('../data-mapper.js');
    
    // Test podium template with non-cam mode
    const nonCamPodium = voiceLeaderboardModule.validate({
      render: { layout: 'podium_and_list' },
      filters: { metric: 'non-cam' },
      entries: [
        { rank: 1, username: 'PlayerOne', durationMinutes: 1000 },
      ],
    });
    const podiumTemplate = templateRegistry.get('study-leaderboard-2');
    const podiumSvg = mapStudyLeaderboardData(podiumTemplate!.content, nonCamPodium);
    const categoryBadgeMatch = podiumSvg.match(/<g id="header-category-badge">[\s\S]*?<\/g>/);
    expect(categoryBadgeMatch).not.toBeNull();
    const categoryBadge = categoryBadgeMatch![0];
    expect(categoryBadge).toContain('HALL OF FAME DECIDED BY');
    expect(categoryBadge).toContain('>CAM HOURS<');
    expect(categoryBadge).toContain('>ONLY.<');
    expect(categoryBadge).not.toContain('NON-CAM');

    // Test extended list template with voice mode
    const voiceList = voiceLeaderboardModule.validate({
      render: { layout: 'list' },
      filters: { metric: 'voice' },
      entries: [
        { rank: 12, username: 'PlayerTwelve', durationMinutes: 500 },
      ],
    });
    const listTemplate = templateRegistry.get('study-leaderboard');
    const listSvg = mapExtendedStudyLeaderboardData(listTemplate!.content, voiceList);
    const extCategoryBadgeMatch = listSvg.match(/<g id="header-category-badge">[\s\S]*?<\/g>/);
    expect(extCategoryBadgeMatch).not.toBeNull();
    const extCategoryBadge = extCategoryBadgeMatch![0];
    expect(extCategoryBadge).toContain('HALL OF FAME DECIDED BY');
    expect(extCategoryBadge).toContain('>CAM HOURS<');
    expect(extCategoryBadge).toContain('>ONLY.<');
    expect(extCategoryBadge).not.toContain('VOICE');
  });
});


