import { buildApp } from './app.js';
import { serverConfig } from './config/server.config.js';
import { renderCache } from './core/cache/render-cache.js';
import { renderQueue } from './core/concurrency/render-queue.js';

async function startServer() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Graceful shutdown initiated');
    try {
      renderQueue.clear();
      renderCache.clear();
      await app.close();
      app.log.info('Server closed successfully');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during server shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    const address = await app.listen({
      port: serverConfig.port,
      host: serverConfig.host,
    });
    app.log.info(`🚀 Cash Mod Image Service listening at ${address}`);
  } catch (err) {
    app.log.error({ err }, 'Fatal error starting server');
    process.exit(1);
  }
}

startServer();
