import { UrlService } from '../src/services/urlService';
import { UrlRepository } from '../src/repositories/urlRepository';
import { UrlCacheRepository } from '../src/repositories/urlCacheRepository';
import { NotFoundError } from '../src/utils/errors';

describe('UrlService', () => {
  function buildService(overrides?: {
    repo?: Partial<jest.Mocked<UrlRepository>>;
    cache?: Partial<jest.Mocked<UrlCacheRepository>>;
    generator?: () => string;
  }) {
    const repo = {
      create: jest.fn(),
      findByShortCode: jest.fn(),
      existsByShortCode: jest.fn(),
      incrementClicks: jest.fn(),
      ...overrides?.repo,
    } as unknown as jest.Mocked<UrlRepository>;

    const cache = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
      ...overrides?.cache,
    } as unknown as jest.Mocked<UrlCacheRepository>;

    const generator = overrides?.generator ?? (() => 'abc123');

    const service = new UrlService(repo, cache, generator, 'http://localhost:3000');
    return { service, repo, cache };
  }

  it('creates a short URL when the generated code is unique', async () => {
    const { service, repo } = buildService({
      repo: { existsByShortCode: jest.fn().mockResolvedValue(false) },
    });

    const result = await service.shorten('https://example.com');

    expect(result).toEqual({
      shortCode: 'abc123',
      shortUrl: 'http://localhost:3000/abc123',
    });
    expect(repo.create).toHaveBeenCalledWith('abc123', 'https://example.com');
  });

  it('regenerates the code on collision', async () => {
    let calls = 0;
    const codes = ['dup001', 'fresh1'];
    const { service, repo } = buildService({
      repo: {
        existsByShortCode: jest.fn().mockImplementation(async (code: string) => code === 'dup001'),
      },
      generator: () => codes[calls++],
    });

    const result = await service.shorten('https://example.com');

    expect(result.shortCode).toBe('fresh1');
    expect(repo.create).toHaveBeenCalledWith('fresh1', 'https://example.com');
  });

  it('returns the cached URL and still increments clicks on a cache hit', async () => {
    const { service, repo, cache } = buildService({
      cache: { get: jest.fn().mockResolvedValue('https://cached.example.com') },
    });

    const url = await service.resolveAndTrack('abc123');

    expect(url).toBe('https://cached.example.com');
    expect(repo.findByShortCode).not.toHaveBeenCalled();
    expect(repo.incrementClicks).toHaveBeenCalledWith('abc123');
  });

  it('falls back to the database and warms the cache on a cache miss', async () => {
    const { service, repo, cache } = buildService({
      cache: { get: jest.fn().mockResolvedValue(null) },
      repo: {
        findByShortCode: jest.fn().mockResolvedValue({
          id: 1,
          shortCode: 'abc123',
          originalUrl: 'https://example.com',
          clicks: 5,
          createdAt: new Date(),
        }),
      },
    });

    const url = await service.resolveAndTrack('abc123');

    expect(url).toBe('https://example.com');
    expect(cache.set).toHaveBeenCalledWith('abc123', 'https://example.com');
    expect(repo.incrementClicks).toHaveBeenCalledWith('abc123');
  });

  it('throws NotFoundError when the short code does not exist', async () => {
    const { service } = buildService({
      cache: { get: jest.fn().mockResolvedValue(null) },
      repo: { findByShortCode: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.resolveAndTrack('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns stats for an existing short code', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const { service } = buildService({
      repo: {
        findByShortCode: jest.fn().mockResolvedValue({
          id: 1,
          shortCode: 'abc123',
          originalUrl: 'https://example.com',
          clicks: 10,
          createdAt,
        }),
      },
    });

    const stats = await service.getStats('abc123');

    expect(stats).toEqual({
      originalUrl: 'https://example.com',
      shortCode: 'abc123',
      clicks: 10,
      createdAt: createdAt.toISOString(),
    });
  });
});
