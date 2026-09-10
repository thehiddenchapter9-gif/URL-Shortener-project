import { Pool, QueryResult } from 'pg';
import { UrlRecord } from '../types/url';

interface UrlRow {
  id: number;
  short_code: string;
  original_url: string;
  clicks: number;
  created_at: Date;
}

function mapRow(row: UrlRow): UrlRecord {
  return {
    id: row.id,
    shortCode: row.short_code,
    originalUrl: row.original_url,
    clicks: row.clicks,
    createdAt: row.created_at,
  };
}

export class UrlRepository {
  constructor(private readonly pool: Pool) {}

  async create(shortCode: string, originalUrl: string): Promise<UrlRecord> {
    const result: QueryResult<UrlRow> = await this.pool.query(
      `INSERT INTO urls (short_code, original_url)
       VALUES ($1, $2)
       RETURNING id, short_code, original_url, clicks, created_at`,
      [shortCode, originalUrl]
    );
    return mapRow(result.rows[0]);
  }

  async findByShortCode(shortCode: string): Promise<UrlRecord | null> {
    const result: QueryResult<UrlRow> = await this.pool.query(
      `SELECT id, short_code, original_url, clicks, created_at
       FROM urls WHERE short_code = $1`,
      [shortCode]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async existsByShortCode(shortCode: string): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM urls WHERE short_code = $1', [
      shortCode,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async incrementClicks(shortCode: string): Promise<number | null> {
    const result: QueryResult<{ clicks: number }> = await this.pool.query(
      `UPDATE urls SET clicks = clicks + 1
       WHERE short_code = $1
       RETURNING clicks`,
      [shortCode]
    );
    return result.rows[0] ? result.rows[0].clicks : null;
  }
}
