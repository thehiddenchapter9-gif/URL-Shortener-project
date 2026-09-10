import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();


const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BASE_URL: z.string().url().default('http://localhost:3000'),

  PGHOST: z.string().min(1).default('localhost'),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGUSER: z.string().min(1).default('postgres'),
  PGPASSWORD: z.string().default('postgres'),
  PGDATABASE: z.string().min(1).default('url_shortener'),
  PG_POOL_MAX: z.coerce.number().int().positive().default(10),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  SHORT_CODE_LENGTH: z.coerce.number().int().min(4).max(10).default(6),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(30),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Fail fast: an invalid configuration should never boot the server.
    // eslint-disable-next-line no-console
    console.error(`Invalid environment configuration:\n${details}`);
    process.exit(1);
  }

  return parsed.data;
}

const raw = loadEnv();

export const env = {
  port: raw.PORT,
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  baseUrl: raw.BASE_URL.replace(/\/+$/, ''), // normalize: strip trailing slash(es)

  pg: {
    host: raw.PGHOST,
    port: raw.PGPORT,
    user: raw.PGUSER,
    password: raw.PGPASSWORD,
    database: raw.PGDATABASE,
    poolMax: raw.PG_POOL_MAX,
  },

  redis: {
    url: raw.REDIS_URL,
    ttlSeconds: raw.REDIS_CACHE_TTL_SECONDS,
  },

  shortCodeLength: raw.SHORT_CODE_LENGTH,
  logLevel: raw.LOG_LEVEL,

  rateLimit: {
    windowMs: raw.RATE_LIMIT_WINDOW_MS,
    maxRequests: raw.RATE_LIMIT_MAX_REQUESTS,
  },
} as const;
