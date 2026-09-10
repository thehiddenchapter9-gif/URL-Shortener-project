import request from 'supertest';
import { createApp } from '../src/app';
import { FakePgPool, FakeRedis } from './fakes';
import { env } from '../src/config/env';

describe('rate limiting on POST /api/shorten', () => {
  it('returns 429 once the per-window limit is exceeded', async () => {
    const app = createApp(new FakePgPool() as any, new FakeRedis() as any);

    const limit = env.rateLimit.maxRequests;
    let lastStatus = 0;

    for (let i = 0; i < limit; i += 1) {
      const res = await request(app)
        .post('/api/shorten')
        .send({ originalUrl: `https://example.com/item-${i}` });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(201);

    const blocked = await request(app)
      .post('/api/shorten')
      .send({ originalUrl: 'https://example.com/one-too-many' });

    expect(blocked.status).toBe(429);
  });

  it('gives a fresh limit to a newly created app instance', async () => {
    // Regression guard: the limiter must be created per-app (see
    // createShortenRateLimiter), not shared as a module-level singleton,
    // or this second app would inherit the first test's exhausted count.
    const app = createApp(new FakePgPool() as any, new FakeRedis() as any);

    const res = await request(app)
      .post('/api/shorten')
      .send({ originalUrl: 'https://example.com/fresh-app' });

    expect(res.status).toBe(201);
  });
});
