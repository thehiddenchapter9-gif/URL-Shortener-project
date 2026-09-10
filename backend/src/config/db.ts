import { Pool } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

export const pool = new Pool({
  host: env.pg.host,
  port: env.pg.port,
  user: env.pg.user,
  password: env.pg.password,
  database: env.pg.database,
  max: env.pg.poolMax,
});

pool.on('error', (err) => {
  // Emitted for errors on idle clients, not on queries themselves.
  // A query-level error is already handled by whoever awaited it.
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});


export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS urls (
      id SERIAL PRIMARY KEY,
      short_code VARCHAR(10) UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      clicks INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls (created_at);
  `);

  logger.info('Database schema is ready');
}


export async function pingDatabase(targetPool: Pool): Promise<boolean> {
  try {
    await targetPool.query('SELECT 1');
    return true;
  } catch (err) {
    logger.error('Database ping failed', { error: (err as Error).message });
    return false;
  }
}
