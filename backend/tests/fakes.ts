

interface FakeRow {
  id: number;
  short_code: string;
  original_url: string;
  clicks: number;
  created_at: Date;
}

export class FakePgPool {
  private rows: FakeRow[] = [];
  private nextId = 1;

  async query(text: string, params: unknown[] = []): Promise<{ rows: unknown[]; rowCount: number }> {
    const sql = text.trim().toUpperCase();

    if (sql.startsWith('INSERT INTO URLS')) {
      const [shortCode, originalUrl] = params as [string, string];
      if (this.rows.some((r) => r.short_code === shortCode)) {
        throw new Error('duplicate key value violates unique constraint');
      }
      const row: FakeRow = {
        id: this.nextId++,
        short_code: shortCode,
        original_url: originalUrl,
        clicks: 0,
        created_at: new Date(),
      };
      this.rows.push(row);
      return { rows: [row], rowCount: 1 };
    }

    if (sql.startsWith('SELECT 1 FROM URLS')) {
      const [shortCode] = params as [string];
      const exists = this.rows.some((r) => r.short_code === shortCode);
      return { rows: exists ? [{ '?column?': 1 }] : [], rowCount: exists ? 1 : 0 };
    }

    if (sql.startsWith('SELECT ID, SHORT_CODE')) {
      const [shortCode] = params as [string];
      const row = this.rows.find((r) => r.short_code === shortCode);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }

    if (sql.startsWith('UPDATE URLS')) {
      const [shortCode] = params as [string];
      const row = this.rows.find((r) => r.short_code === shortCode);
      if (!row) return { rows: [], rowCount: 0 };
      row.clicks += 1;
      return { rows: [{ clicks: row.clicks }], rowCount: 1 };
    }

    if (sql.startsWith('SELECT 1')) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // CREATE TABLE / CREATE INDEX from initSchema - no-op for tests.
    return { rows: [], rowCount: 0 };
  }

  // Mimics pg.Pool's EventEmitter surface used by src/config/db.ts.
  on(): void {
    /* no-op */
  }

  async end(): Promise<void> {
    /* no-op */
  }
}

export class FakeRedis {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async set(key: string, value: string, ..._args: unknown[]): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }

  on(): void {
    /* no-op */
  }

  disconnect(): void {
    /* no-op */
  }
}
