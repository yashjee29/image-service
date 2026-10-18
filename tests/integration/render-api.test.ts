import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { buildApp } from '../../src/app.js';

describe('HTTP API Integration Tests', () => {
  let app: FastifyInstance;

  const validApiPayload = {
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

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health & Metadata Endpoints', () => {
    it('GET /health returns liveness status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.status).toBe('ok');
      expect(json.service).toBe('cash-mod-image-service');
    });

    it('GET /ready returns readiness status with registered modules and aliases', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.status).toBe('ready');
      expect(json.modules).toContain('voice-profile');
      expect(json.modules).toContain('voice-leaderboard');
    });

    it('GET /api/v1/modules lists registered module metadata', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/modules',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.modules).toHaveLength(2);

      const profileModule = json.modules.find((m: { id: string }) => m.id === 'voice-profile');
      expect(profileModule).toBeDefined();
      expect(profileModule.defaultDimensions).toEqual({ width: 1200, height: 835 });
    });
  });

  describe('POST /api/v1/render/profile-card-v1', () => {
    it('renders profile card PNG from unified API payload with cache MISS then HIT', async () => {
      // 1. Initial render -> Cache MISS
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/render/profile-card-v1',
        payload: validApiPayload,
      });

      expect(res1.statusCode).toBe(200);
      expect(res1.headers['content-type']).toBe('image/png');
      expect(res1.headers['x-cache']).toBe('MISS');
      expect(res1.headers['cache-control']).toBe('no-store');

      const pngBuffer = res1.rawPayload;
      // Check PNG magic bytes: \x89PNG\r\n\x1a\n
      expect(pngBuffer[0]).toBe(0x89);
      expect(pngBuffer[1]).toBe(0x50);
      expect(pngBuffer[2]).toBe(0x4e);
      expect(pngBuffer[3]).toBe(0x47);

      // Verify dimensions with sharp
      const meta = await sharp(pngBuffer).metadata();
      expect(meta.width).toBe(1200);
      expect(meta.height).toBe(835);
      expect(meta.format).toBe('png');

      // 2. Second render with exact same payload -> Cache HIT
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/render/profile-card-v1',
        payload: validApiPayload,
      });

      expect(res2.statusCode).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');
      expect(res2.rawPayload.equals(pngBuffer)).toBe(true);
    });

    it('rejects invalid payload with 400 and VALIDATION_ERROR code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/profile-card-v1',
        payload: {
          ...validApiPayload,
          counters: {
            achievements: -10, // Invalid: negative
            goals: 0,
            milestones: 0,
          },
        },
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/render (Direct Unified Endpoint)', () => {
    it('dispatches to profile-card-v1 based on body.render.templateId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render',
        payload: {
          ...validApiPayload,
          requestId: 'profile-render-direct-002',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');

      const pngBuffer = res.rawPayload;
      const meta = await sharp(pngBuffer).metadata();
      expect(meta.width).toBe(1200);
      expect(meta.height).toBe(835);
      expect(meta.format).toBe('png');
    });

    it('dispatches to study-leaderboard-v1 with requesterUserId highlight', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render',
        payload: {
          schemaVersion: '1.0',
          requestId: 'leaderboard-render-integration-001',
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
              { position: 1, userId: 'user-001', username: 'Aarav', durationMinutes: 19260, rank: { id: 'immortal', name: 'Immortal' } },
              { position: 2, userId: 'user-002', username: 'Sakha', durationMinutes: 17040, rank: { id: 'ascendant', name: 'Ascendant' } },
              { position: 3, userId: 'user-003', username: 'Mira', durationMinutes: 15060, rank: { id: 'diamond', name: 'Diamond' } },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');

      const pngBuffer = res.rawPayload;
      const meta = await sharp(pngBuffer).metadata();
      expect(meta.width).toBe(1536);
      expect(meta.height).toBe(1024);
      expect(meta.format).toBe('png');
    });
  });

  describe('POST /api/v1/render/voice-leaderboard', () => {
    it('renders voice leaderboard PNG with valid entries', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-leaderboard',
        payload: {
          data: {
            title: 'WEEKLY VOICE LEADERS',
            period: 'OCTOBER 2026',
            entries: [
              { rank: 1, username: 'Alice', hours: '45h 20m', badge: 'Diamond' },
              { rank: 2, username: 'Bob', hours: '38h 10m', badge: 'Platinum' },
              { rank: 3, username: 'Charlie', hours: '29h 05m', badge: 'Gold' },
              { rank: 4, username: 'David', hours: '22h 00m' },
              { rank: 5, username: 'Eve', hours: '19h 45m', isCurrentUser: true },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');

      const pngBuffer = res.rawPayload;
      const meta = await sharp(pngBuffer).metadata();
      expect(meta.width).toBe(1200);
      expect(meta.height).toBe(835);
      expect(meta.format).toBe('png');
    });
  });

  describe('Error handling', () => {
    it('returns 404 with MODULE_NOT_FOUND when requesting non-existent module', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/non-existent-module',
        payload: { data: {} },
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('MODULE_NOT_FOUND');
    });
  });
});
