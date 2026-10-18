import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
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
import { TemplateNotFoundError, UnauthorizedError } from '../utils/errors.js';

interface RenderRouteParams {
  moduleId?: string;
}

interface RenderRequestBody {
  data?: unknown;
  options?: RenderOptions;
  render?: {
    templateId?: string;
    format?: string;
    scale?: number;
  };
  [key: string]: unknown;
}

async function handleRenderRequest(
  request: FastifyRequest<{
    Params: RenderRouteParams;
    Body: RenderRequestBody;
  }>,
  reply: FastifyReply
) {
  const tracker = new PerformanceTracker();
  const body = (request.body as RenderRequestBody) || {};

  // 1. Resolve moduleId from route params or body.render.templateId or body.templateId
  const targetModuleId =
    request.params?.moduleId ||
    body.render?.templateId ||
    (body.templateId as string | undefined) ||
    'profile-card-v1';

  // 2. Authentication check
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

  // 3. Resolve module & template
  const module = moduleRegistry.get(targetModuleId);
  const template = templateRegistry.get(targetModuleId) || templateRegistry.get(module.id);
  if (!template) {
    throw new TemplateNotFoundError(
      `Template for module '${targetModuleId}' not found in registry`
    );
  }

  // 4. Validate input
  tracker.startStage('validation');
  // If request has data field, use it; otherwise use full body
  const rawInput = body.data !== undefined ? body.data : body;
  const validatedData = module.validate(rawInput);

  // Derive options
  const scale = body.render?.scale ?? 1;
  const anyBody = body as any;
  const isStudy =
    module.id === 'voice-leaderboard' &&
    (targetModuleId.includes('study') ||
      body.render?.templateId?.includes('study') === true ||
      anyBody.leaderboard?.entries !== undefined ||
      anyBody.leaderboard?.range !== undefined);
  const baseDefaultWidth = isStudy ? 1536 : module.defaultDimensions.width;
  const targetWidth = body.options?.dimensions?.width ?? baseDefaultWidth;
  const options: RenderOptions = {
    ...body.options,
    dimensions: {
      width: Math.round(targetWidth * scale),
      scale,
    },
  };
  tracker.endStage('validation');

  // 5. Cache lookup
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
      moduleId: targetModuleId,
    });

    return reply
      .type('image/png')
      .header('Content-Length', cachedBuffer.length)
      .header('X-Cache', 'HIT')
      .header('X-Render-Time-Ms', perfSummary.totalDurationMs)
      .header('Cache-Control', 'no-store')
      .send(cachedBuffer);
  }

  // 6. Concurrency-controlled render
  let pngBuffer: Buffer;
  try {
    pngBuffer = await renderQueue.run(async () => {
      const context = createRenderContext(
        targetModuleId,
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
      moduleId: targetModuleId,
    });
    throw err;
  }

  // 7. Cache the successful result
  renderCache.set(cacheKey, pngBuffer);

  const perfSummary = tracker.getSummary();
  metricsCollector.recordRender({
    durationMs: perfSummary.totalDurationMs,
    success: true,
    cached: false,
    moduleId: targetModuleId,
  });

  return reply
    .type('image/png')
    .header('Content-Length', pngBuffer.length)
    .header('X-Cache', 'MISS')
    .header('X-Render-Time-Ms', perfSummary.totalDurationMs)
    .header('Cache-Control', 'no-store')
    .send(pngBuffer);
}

export const renderRoutes: FastifyPluginAsync = async (fastify) => {
  // Support both POST /api/v1/render/:moduleId and POST /api/v1/render
  fastify.post<{
    Params: RenderRouteParams;
    Body: RenderRequestBody;
  }>('/api/v1/render/:moduleId', handleRenderRequest);

  fastify.post<{
    Params: RenderRouteParams;
    Body: RenderRequestBody;
  }>('/api/v1/render', handleRenderRequest);
};
