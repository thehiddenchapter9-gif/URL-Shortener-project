import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.redis.url, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  retryStrategy: (attempt: number) => Math.min(attempt * 200, 2000),
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});


export async function pingRedis(client: Redis): Promise<boolean> {
  try {
    const reply = await client.ping();
    return reply === 'PONG';
  } catch (err) {
    logger.error('Redis ping failed', { error: (err as Error).message });
    return false;
  }
}
