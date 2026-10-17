import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { isPrivateIp, validateSafeUrl } from '../../src/core/images/image-fetcher.js';
import { AssetFetchError } from '../../src/utils/errors.js';
import { buildApp } from '../../src/app.js';
import { securityConfig } from '../../src/config/security.config.js';

describe('Security Tests', () => {
  describe('SSRF Protection (Image Fetcher)', () => {
    it('identifies private IPv4 addresses correctly', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.1.2.3')).toBe(true);
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.254')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('169.254.169.254')).toBe(true); // AWS metadata
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('224.0.0.1')).toBe(true); // Multicast
    });

    it('identifies public IPv4 addresses as non-private', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('142.250.190.46')).toBe(false);
    });

    it('identifies IPv6 loopback and private addresses correctly', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('::')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true); // Link-local
      expect(isPrivateIp('fc00::1')).toBe(true); // Unique local
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true); // IPv4-mapped loopback
    });

    it('rejects disallowed protocols (file://, ftp://)', async () => {
      await expect(validateSafeUrl('file:///etc/passwd')).rejects.toThrow(AssetFetchError);
      await expect(validateSafeUrl('ftp://example.com/avatar.png')).rejects.toThrow(AssetFetchError);
    });

    it('blocks dangerous hostnames and loopbacks', async () => {
      await expect(validateSafeUrl('http://localhost/avatar.png')).rejects.toThrow(AssetFetchError);
      await expect(validateSafeUrl('http://127.0.0.1/avatar.png')).rejects.toThrow(AssetFetchError);
      await expect(validateSafeUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(AssetFetchError);
      await expect(validateSafeUrl('http://metadata.google.internal/computeMetadata/v1')).rejects.toThrow(AssetFetchError);
    });
  });

  describe('SVG Injection Protection', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('safely escapes special XML/SVG characters in username and bio without breaking XML', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        payload: {
          data: {
            username: '<script>alert(1)</script>',
            bio: '<text y="50">Safe</text>&copy;',
          },
        },
      });

      // Must render successfully (not crash with invalid XML syntax)
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
    });

    it('rejects oversized JSON request body with 413', async () => {
      const largePayload = {
        data: {
          username: 'A',
          bio: 'B'.repeat(1024 * 1024 * 3), // 3MB string > 2MB limit
        },
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        payload: largePayload,
      });

      expect(res.statusCode).toBe(413);
    });
  });

  describe('Service Authentication', () => {
    let app: FastifyInstance;
    const testSecret = 'cash-mod-secret-token-test-123';

    beforeAll(async () => {
      // Temporarily enable auth
      securityConfig.authEnabled = true;
      securityConfig.serviceAuthToken = testSecret;
      app = await buildApp();
    });

    afterAll(async () => {
      securityConfig.authEnabled = false;
      securityConfig.serviceAuthToken = '';
      await app.close();
    });

    it('rejects request with 401 when authorization header is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        payload: { data: {} },
      });

      expect(res.statusCode).toBe(401);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects request with 401 when token is incorrect', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        headers: {
          authorization: 'Bearer wrong-token',
        },
        payload: { data: {} },
      });

      expect(res.statusCode).toBe(401);
    });

    it('accepts request with 200 when valid Bearer token is provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        headers: {
          authorization: `Bearer ${testSecret}`,
        },
        payload: { data: {} },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
    });

    it('accepts request with 200 when valid X-Service-Token header is provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/render/voice-profile',
        headers: {
          'x-service-token': testSecret,
        },
        payload: { data: {} },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
    });
  });
});
