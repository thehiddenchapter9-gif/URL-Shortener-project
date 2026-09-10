import { Server } from 'http';
import { env } from './config/env';
import { pool, initSchema } from './config/db';
import { redis } from './config/redis';
import { createApp } from './app';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await initSchema();

  const app = createApp(pool, redis);

  const server: Server = app.listen(env.port, () => {
    logger.info(`URL shortener API listening on port ${env.port} (${env.nodeEnv})`);
  });

  registerGracefulShutdown(server);
}


function registerGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully`);

    server.close(async () => {
      try {
        await pool.end();
        redis.disconnect();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: (err as Error).message });
        process.exit(1);
      }
    });

    // Safety net in case something hangs and never calls the close callback.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: (err as Error).message });
  process.exit(1);
});
