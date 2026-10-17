import { env } from './env.js';

export const serverConfig = {
  host: env.HOST,
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  bodyLimit: 1024 * 1024 * 2, // 2MB max JSON body
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  },
};
