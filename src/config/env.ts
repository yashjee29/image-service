import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

loadDotenv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Internal Service Authentication
  SERVICE_AUTH_TOKEN: z.string().default(''),
  AUTH_ENABLED: z
    .string()
    .optional()
    .transform((val) => val === 'true'),

  // In-Memory Render Cache
  CACHE_ENABLED: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
  CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(500),
  CACHE_MAX_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024), // 100 MB
  CACHE_TTL_MS: z.coerce.number().int().positive().default(60_000), // 60 seconds

  // Concurrency & Queueing
  MAX_CONCURRENT_RENDERS: z.coerce.number().int().positive().default(4),
  MAX_QUEUE_SIZE: z.coerce.number().int().positive().default(50),
  RENDER_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000), // 10 seconds

  // External Asset Ingestion
  ASSET_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000), // 5 seconds
  MAX_ASSET_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024), // 10 MB

  // Fonts Directory
  FONTS_DIR: z.string().default(resolve(process.cwd(), 'assets/fonts')),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:', JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = parseEnv();
