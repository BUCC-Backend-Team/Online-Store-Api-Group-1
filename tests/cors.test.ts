import request from 'supertest';

import app from '@src/server';

vi.mock('@src/repos/tokenRepo', (): typeof import('@src/repos/tokenRepo') => {
  const mock = {
    newJti: vi.fn(() => 'test-jti'),
    store: vi.fn(),
    exists: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
  };
  return { default: mock, ...mock };
});

vi.mock('@src/repos/UserRepo', (): typeof import('@src/repos/UserRepo') => {
  const mock = {
    getById: vi.fn(),
    getByEmail: vi.fn(),
    getAll: vi.fn(),
    create: vi.fn(),
    updateProfile: vi.fn(),
    remove: vi.fn(),
    countAdmins: vi.fn(),
  };
  return { ...mock, default: mock };
});

vi.mock('@src/config/db', () => ({
  default: {
    pool: { query: vi.fn() },
    connectDb: vi.fn(),
    closeDb: vi.fn(),
    withTransaction: vi.fn(),
  },
}));

vi.mock('@src/config/redis', () => ({
  default: {
    client: { on: vi.fn() },
    ensureConnected: vi.fn(),
    connectRedis: vi.fn(),
    closeRedis: vi.fn(),
  },
}));

describe('CORS', () => {
  it('should set CORS headers for an allowed origin (dev reflects any).', async () => {
    const res = await request(app)
      .get('/api/product')
      .set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
  });

  it('should answer preflight requests.', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
  });

  it('should allow requests without an Origin (curl, tests).', async () => {
    // Unknown route on purpose: only asserting the request passes CORS
    // (404 from the router, not a CORS rejection).
    const res = await request(app).get('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
  });
});
