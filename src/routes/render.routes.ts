import type { FastifyPluginAsync } from 'fastify';
import { generateCacheKey } from '../core/cache/cache-key.js';
import { renderCache } from '../core/cache/render-cache.js';
import { renderQueue } from '../core/concurrency/render-queue.js';
import { metricsCollector } from '../core/observability/metrics.js';
import { PerformanceTracker } from '../core/observability/performance-tracker.js';
import { createRenderContext } from '../core/renderer/renderer.factory.js';
import type { RenderOptions } from '../core/renderer/renderer.types.js';
import { templateRegistry } from '../core/templates/template-registry.js';
import { moduleRegistry } from '../modules/registry.js';
import { securityConfig } from '../config/security.config.js';
import { TemplateNotFoundError, UnauthorizedError, ValidationError } from '../utils/errors.js';

interface RenderRouteParams {
  moduleId: string;
}

interface RenderRequestBody {
  data?: unknown;
  options?: RenderOptions;
  [key: string]: unknown;
}

export const renderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Params: RenderRouteParams;
    Body: RenderRequestBody;
  }>('/api/v1/render/:moduleId', async (request, reply) => {
    const tracker = new PerformanceTracker();
    const { moduleId } = request.params;

    // 1. Authentication check
    if (securityConfig.authEnabled) {
      const authHeader = request.headers.authorization;
      const serviceTokenHeader = request.headers['x-service-token'];

      let token = '';
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else if (typeof serviceTokenHeader === 'string') {
        token = serviceTokenHeader.trim();
      }

      if (!token || token !== securityConfig.serviceAuthToken) {
        throw new UnauthorizedError('Invalid or missing service authentication token');
      }
    }

    // 2. Resolve module
    const module = moduleRegistry.get(moduleId);
    const template = templateRegistry.get(moduleId);
    if (!template) {
      throw new TemplateNotFoundError(`Template for module '${moduleId}' not found in registry`);
    }

    // 3. Validate input
    tracker.startStage('validation');
    const body = request.body || {};
    // Support either { data: { ... } } or direct payload { username: ... }
    const rawInput = body.data !== undefined ? body.data : body;
    const validatedData = module.validate(rawInput);
    const options = body.options;
    tracker.endStage('validation');

    // 4. Cache lookup
    tracker.startStage('cache_lookup');
    const cacheKey = generateCacheKey({
      moduleId: module.id,
      moduleVersion: module.version,
      templateVersion: template.version,
      input: validatedData,
      options,
    });

    const cachedBuffer = renderCache.get(cacheKey);
    tracker.endStage('cache_lookup');

    if (cachedBuffer) {
      const perfSummary = tracker.getSummary();
      metricsCollector.recordRender({
        durationMs: perfSummary.totalDurationMs,
        success: true,
        cached: true,
        moduleId,
      });

      return reply
        .type('image/png')
        .header('Content-Length', cachedBuffer.length)
        .header('X-Cache', 'HIT')
        .header('X-Render-Time-Ms', perfSummary.totalDurationMs)
        .header('Cache-Control', 'no-store')
        .send(cachedBuffer);
    }

    // 5. Render with concurrency & queue management
    let pngBuffer: Buffer;
    try {
      pngBuffer = await renderQueue.run(async () => {
        const context = createRenderContext(
          moduleId,
          options,
          async (stage, fn) => tracker.measure(stage, fn)
        );
        return await module.render(validatedData, context);
      });
    } catch (err) {
      const perfSummary = tracker.getSummary();
      metricsCollector.recordRender({
        durationMs: perfSummary.totalDurationMs,
        success: false,
        cached: false,
        moduleId,
      });
      throw err;
    }

    // 6. Cache the successful result
    renderCache.set(cacheKey, pngBuffer);

    const perfSummary = tracker.getSummary();
    metricsCollector.recordRender({
      durationMs: perfSummary.totalDurationMs,
      success: true,
      cached: false,
      moduleId,
    });

    return reply
      .type('image/png')
      .header('Content-Length', pngBuffer.length)
      .header('X-Cache', 'MISS')
      .header('X-Render-Time-Ms', perfSummary.totalDurationMs)
      .header('Cache-Control', 'no-store')
      .send(pngBuffer);
  });
};
