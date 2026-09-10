import { UrlRepository } from '../repositories/urlRepository';
import { UrlCacheRepository } from '../repositories/urlCacheRepository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { ShortenResponseBody, StatsResponseBody } from '../types/url';
import { logger } from '../utils/logger';

/** How many times we retry generating a fresh code before giving up. */
const MAX_GENERATION_ATTEMPTS = 5;

/**
 * Encapsulates all business rules for URL shortening: code generation and
 * collision handling, cache-aside reads on redirect, click tracking, and
 * abuse guards (self-referential links). Controllers depend only on this
 * class; they never talk to the repositories directly.
 */
export class UrlService {
  constructor(
    private readonly urlRepository: UrlRepository,
    private readonly urlCacheRepository: UrlCacheRepository,
    private readonly generateShortCode: () => string,
    private readonly baseUrl: string
  ) {}

  /**
   * Creates a new short link for `originalUrl`.
   *
   * Generates a random code and retries on collision (either an existing
   * row or a race lost against the DB's unique constraint) up to
   * {@link MAX_GENERATION_ATTEMPTS} times before giving up with a 500.
   */
  async shorten(originalUrl: string): Promise<ShortenResponseBody> {
    this.assertNotSelfReferential(originalUrl);

    let shortCode = '';
    let created = false;

    for (let attempts = 1; attempts <= MAX_GENERATION_ATTEMPTS && !created; attempts += 1) {
      shortCode = this.generateShortCode();

      const alreadyTaken = await this.urlRepository.existsByShortCode(shortCode);
      if (alreadyTaken) {
        continue;
      }

      try {
        await this.urlRepository.create(shortCode, originalUrl);
        created = true;
      } catch (err) {
         
        logger.warn('Short code collision on insert, retrying', {
          shortCode,
          attempt: attempts,
          error: (err as Error).message,
        });
      }
    }

    if (!created) {
      throw new ConflictError('Could not generate a unique short code, please try again');
    }

    logger.info('Short link created', { shortCode });

    return {
      shortCode,
      shortUrl: `${this.baseUrl}/${shortCode}`,
    };
  }

  
  async resolveAndTrack(shortCode: string): Promise<string> {
    const cachedUrl = await this.urlCacheRepository.get(shortCode);

    if (cachedUrl) {
      await this.urlRepository.incrementClicks(shortCode);
      return cachedUrl;
    }

    const record = await this.urlRepository.findByShortCode(shortCode);
    if (!record) {
      throw new NotFoundError('Short code not found');
    }

    await this.urlCacheRepository.set(shortCode, record.originalUrl);
    await this.urlRepository.incrementClicks(shortCode);
    return record.originalUrl;
  }

  /** Returns click count, original URL, and creation date for a short code. */
  async getStats(shortCode: string): Promise<StatsResponseBody> {
    const record = await this.urlRepository.findByShortCode(shortCode);
    if (!record) {
      throw new NotFoundError('Short code not found');
    }

    return {
      originalUrl: record.originalUrl,
      shortCode: record.shortCode,
      clicks: record.clicks,
      createdAt: record.createdAt.toISOString(),
    };
  }

 
  private assertNotSelfReferential(originalUrl: string): void {
    let target: URL;
    let base: URL;

    try {
      target = new URL(originalUrl);
      base = new URL(this.baseUrl);
    } catch {
      
      return;
    }

    if (target.host === base.host) {
      throw new ValidationError(
        'originalUrl cannot point back to this service (would create a circular redirect)'
      );
    }
  }
}
