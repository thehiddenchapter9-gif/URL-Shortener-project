import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Pool } from 'pg';
import Redis from 'ioredis';

import { env } from './config/env';
import { pingDatabase } from './config/db';
import { pingRedis } from './config/redis';
import { logger } from './utils/logger';
import { UrlRepository } from './repositories/urlRepository';
import { UrlCacheRepository } from './repositories/urlCacheRepository';
import { UrlService } from './services/urlService';
import { UrlController } from './controllers/urlController';
import { createApiRouter, createRedirectRouter } from './routes/urlRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createShortCodeGenerator } from './utils/shortCode';

const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};


export function createApp(pool: Pool, redis: Redis): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));
  app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: morganStream }));

  // --- Dependency wiring (composition root) ---------------------------
  const urlRepository = new UrlRepository(pool);
  const urlCacheRepository = new UrlCacheRepository(redis, env.redis.ttlSeconds);
  const generateShortCode = createShortCodeGenerator(env.shortCodeLength);
  const urlService = new UrlService(urlRepository, urlCacheRepository, generateShortCode, env.baseUrl);
  const urlController = new UrlController(urlService);

  // --- Health checks ----------------------------------------------------
  // Liveness: process is up and serving HTTP.
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  // Readiness: process is up AND its dependencies are reachable.
  app.get('/health/ready', async (_req, res) => {
    const [dbOk, redisOk] = await Promise.all([pingDatabase(pool), pingRedis(redis)]);
    const ready = dbOk && redisOk;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'unavailable',
      dependencies: { postgres: dbOk, redis: redisOk },
    });
  });

  // --- Routes -------------------------------------------------------------
  app.use('/api', createApiRouter(urlController));
  
  app.use('/', createRedirectRouter(urlController));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
