import Redis from 'ioredis';

const KEY_PREFIX = 'url:';

export class UrlCacheRepository {
  constructor(private readonly redis: Redis, private readonly ttlSeconds: number) {}

  private key(shortCode: string): string {
    return `${KEY_PREFIX}${shortCode}`;
  }

  async get(shortCode: string): Promise<string | null> {
    return this.redis.get(this.key(shortCode));
  }

  async set(shortCode: string, originalUrl: string): Promise<void> {
    await this.redis.set(this.key(shortCode), originalUrl, 'EX', this.ttlSeconds);
  }

  async invalidate(shortCode: string): Promise<void> {
    await this.redis.del(this.key(shortCode));
  }
}
