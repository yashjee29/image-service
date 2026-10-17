import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { buildApp } from '../../src/app.js';

describe('HTTP API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health & Metadata', () => {
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

    it('GET /ready returns readiness status with registered modules', async () => {
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

  describe('POST /api/v1/render/voice-profile', () => {
    it('renders voice profile PNG with raw buffer, correct headers, and cache behavior', async () => {
      const payload = {
        data: {
          username: 'IntegrationUser',
          bio: 'Testing API endpoints',
          achievements: 15,
          goals: 8,
          milestones: 4,
          leaderboard: {
            rank: '#3',
            percentile: 'Top 5%',
          },
        },
      };

      // 1. Initial render -> Cache MISS
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        payload,
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

      // 2. Second render with same payload -> Cache HIT
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        payload,
      });

      expect(res2.statusCode).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');
      expect(res2.rawPayload.equals(pngBuffer)).toBe(true);
    });

    it('rejects invalid payload with 400 and clean JSON error', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        payload: {
          data: {
            achievements: -1, // Invalid: negative number
          },
        },
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
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
