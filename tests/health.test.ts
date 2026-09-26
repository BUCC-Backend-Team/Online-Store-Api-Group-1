import request from 'supertest';

import app from '@src/server';

vi.mock('@src/config/db', () => ({
  default: {
    pool: {
      query: vi.fn(() => Promise.resolve({ rows: [[1]], rowCount: 1 })),
    },
    connectDb: vi.fn(),
    closeDb: vi.fn(),
    withTransaction: vi.fn(),
  },
}));

vi.mock('@src/config/redis', () => ({
  default: {
    client: {
      on: vi.fn(),
      ping: vi.fn(() => Promise.resolve('PONG')),
    },
    ensureConnected: vi.fn(),
    connectRedis: vi.fn(),
    closeRedis: vi.fn(),
  },
}));

function body<T>(res: { body: unknown }): T {
  return res.body as T;
}

describe('GET /api/health', () => {
  it('should report ok when the database and cache are up.', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    const payload = body<{
      status: string;
      services: { database: string; cache: string };
      timestamp: string;
    }>(res);
    expect(payload.status).toBe('ok');
    expect(payload.services.database).toBe('up');
    expect(payload.services.cache).toBe('up');
    expect(payload.timestamp).toBeTruthy();
  });

  it('should report degraded with 200 when only the cache is down.', async () => {
    const { default: redis } = await import('@src/config/redis');
    vi.mocked(redis.ensureConnected).mockRejectedValueOnce(
      new Error('Redis is unreachable'),
    );

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    const payload = body<{
      status: string;
      services: { database: string; cache: string };
    }>(res);
    expect(payload.status).toBe('ok');
    expect(payload.services.database).toBe('up');
    expect(payload.services.cache).toBe('down');
  });

  it('should report error with 503 when the database is down.', async () => {
    const { default: db } = await import('@src/config/db');
    vi.spyOn(db.pool, 'query').mockRejectedValueOnce(
      new Error('ECONNREFUSED'),
    );

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    const payload = body<{
      status: string;
      services: { database: string };
    }>(res);
    expect(payload.status).toBe('error');
    expect(payload.services.database).toBe('down');
  });

  it('should not require authentication.', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).not.toBe(401);
  });
});
