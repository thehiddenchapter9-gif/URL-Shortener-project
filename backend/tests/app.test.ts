import request from 'supertest';
import { createApp } from '../src/app';
import { FakePgPool, FakeRedis } from './fakes';


function buildTestApp() {
  const pool = new FakePgPool();
  const redis = new FakeRedis();
  const app = createApp(pool as any, redis as any);
  return { app, pool, redis };
}

describe('POST /api/shorten', () => {
  it('creates a short link for a valid URL', async () => {
    const { app } = buildTestApp();

    const res = await request(app)
      .post('/api/shorten')
      .send({ originalUrl: 'https://example.com/some/path' });

    expect(res.status).toBe(201);
    expect(res.body.shortCode).toHaveLength(6);
    expect(res.body.shortUrl).toContain(res.body.shortCode);
  });

  it('rejects an invalid URL with 400', async () => {
    const { app } = buildTestApp();

    const res = await request(app).post('/api/shorten').send({ originalUrl: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects a missing originalUrl field with 400', async () => {
    const { app } = buildTestApp();

    const res = await request(app).post('/api/shorten').send({});

    expect(res.status).toBe(400);
  });

  it('rejects a link that points back at this service', async () => {
    const { app } = buildTestApp();

    const res = await request(app)
      .post('/api/shorten')
      .send({ originalUrl: 'http://localhost:3000/abc123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/circular/i);
  });
});

describe('GET /:shortCode', () => {
  it('redirects to the original URL and increments clicks', async () => {
    const { app } = buildTestApp();

    const created = await request(app)
      .post('/api/shorten')
      .send({ originalUrl: 'https://example.com/redirect-me' });
    const { shortCode } = created.body;

    const redirectRes = await request(app).get(`/${shortCode}`);
    expect(redirectRes.status).toBe(302);
    expect(redirectRes.headers.location).toBe('https://example.com/redirect-me');

    const statsRes = await request(app).get(`/api/stats/${shortCode}`);
    expect(statsRes.body.clicks).toBe(1);
  });

  it('serves subsequent redirects from the cache without changing the result', async () => {
    const { app } = buildTestApp();

    const created = await request(app)
      .post('/api/shorten')
      .send({ originalUrl: 'https://example.com/cached' });
    const { shortCode } = created.body;

    await request(app).get(`/${shortCode}`);
    await request(app).get(`/${shortCode}`);
    const third = await request(app).get(`/${shortCode}`);

    expect(third.headers.location).toBe('https://example.com/cached');

    const statsRes = await request(app).get(`/api/stats/${shortCode}`);
    expect(statsRes.body.clicks).toBe(3);
  });

  it('returns 404 for an unknown short code', async () => {
    const { app } = buildTestApp();

    const res = await request(app).get('/zzzzzz');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/stats/:shortCode', () => {
  it('returns stats for an existing short code', async () => {
    const { app } = buildTestApp();

    const created = await request(app)
      .post('/api/shorten')
      .send({ originalUrl: 'https://example.com/stats-me' });
    const { shortCode } = created.body;

    const res = await request(app).get(`/api/stats/${shortCode}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      originalUrl: 'https://example.com/stats-me',
      shortCode,
      clicks: 0,
    });
    expect(typeof res.body.createdAt).toBe('string');
  });

  it('returns 404 for an unknown short code', async () => {
    const { app } = buildTestApp();

    const res = await request(app).get('/api/stats/zzzzzz');
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed short code', async () => {
    const { app } = buildTestApp();

    const res = await request(app).get('/api/stats/has-dash');
    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('reports liveness', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('reports readiness based on dependency pings', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
