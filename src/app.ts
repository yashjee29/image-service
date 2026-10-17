import fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { serverConfig } from './config/server.config.js';
import { fontRegistry } from './core/fonts/font-registry.js';
import { moduleRegistry } from './modules/registry.js';
import { voiceProfileModule } from './modules/voice-profile/index.js';
import { voiceLeaderboardModule } from './modules/voice-leaderboard/index.js';
import { errorHandler } from './plugins/error-handler.js';
import { requestContextPlugin } from './plugins/request-context.js';
import { healthRoutes } from './routes/health.routes.js';
import { metadataRoutes } from './routes/metadata.routes.js';
import { renderRoutes } from './routes/render.routes.js';

export function initializeServices(): void {
  // Initialize fonts once at startup
  fontRegistry.initialize();

  // Register all modules explicitly in the registry
  if (!moduleRegistry.has(voiceProfileModule.id)) {
    moduleRegistry.register(voiceProfileModule);
  }
  if (!moduleRegistry.has(voiceLeaderboardModule.id)) {
    moduleRegistry.register(voiceLeaderboardModule);
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  initializeServices();

  const app = fastify({
    logger: serverConfig.isTest
      ? false
      : {
          level: serverConfig.logLevel,
          transport:
            serverConfig.nodeEnv === 'development'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
        },
    bodyLimit: serverConfig.bodyLimit,
  });

  // Rate Limiting
  if (!serverConfig.isTest) {
    await app.register(rateLimit, {
      max: serverConfig.rateLimit.max,
      timeWindow: serverConfig.rateLimit.timeWindow,
    });
  }

  // Custom Plugins
  await app.register(requestContextPlugin);
  app.setErrorHandler(errorHandler);

  // Register Routes
  await app.register(healthRoutes);
  await app.register(metadataRoutes);
  await app.register(renderRoutes);

  return app;
}
