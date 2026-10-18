import { env } from './env.js';

export const rendererConfig = {
  baseConcurrentRenders: env.BASE_CONCURRENCY,
  burstConcurrentRenders: env.BURST_CONCURRENCY,
  burstQueueThreshold: env.BURST_QUEUE_THRESHOLD,
  maxConcurrentRenders: env.MAX_CONCURRENT_RENDERS,
  maxQueueSize: env.MAX_QUEUE_SIZE,
  renderTimeoutMs: env.RENDER_TIMEOUT_MS,
  defaultBackground: 'rgba(0,0,0,0)',
  fontsDir: env.FONTS_DIR,
  loadSystemFonts: false,
};
