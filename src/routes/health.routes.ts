import type { FastifyPluginAsync } from 'fastify';
import { fontRegistry } from '../core/fonts/font-registry.js';
import { templateRegistry } from '../core/templates/template-registry.js';
import { moduleRegistry } from '../modules/registry.js';
import { metricsCollector } from '../core/observability/metrics.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Liveness check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'cash-mod-image-service',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  });

  // Readiness check
  fastify.get('/ready', async (_request, reply) => {
    const modules = moduleRegistry.getAll();
    const templates = templateRegistry.getAll();
    const fontsInitialized = fontRegistry.isInitialized();

    const isReady = modules.length > 0 && templates.size >= modules.length && fontsInitialized;

    if (!isReady) {
      return reply.status(503).send({
        status: 'not_ready',
        checks: {
          modulesRegistered: modules.length,
          templatesLoaded: templates.size,
          fontsInitialized,
        },
      });
    }

    return {
      status: 'ready',
      modules: modules.map((m) => m.id),
      templatesCount: templates.size,
      fonts: fontRegistry.getSummary(),
    };
  });

  // Observability metrics endpoint
  fastify.get('/metrics', async () => {
    return metricsCollector.getSnapshot();
  });
};
