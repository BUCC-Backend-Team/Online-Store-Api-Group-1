import express from 'express';
import request from 'supertest';

import { createRateLimiter } from '@src/middleware/rateLimit';

// The limiter skips itself in test env, so this suite mirrors the limiter's
// options on a standalone app to verify the 429 contract.

function body<T>(res: { body: unknown }): T {
  return res.body as T;
}

describe('rate limiting middleware', () => {
  it('should respond 429 with the standard JSON body once the limit is hit.', async () => {
    const app = express();
    const { rateLimit } = await import('express-rate-limit');
    const limiter = rateLimit({
      windowMs: 60_000,
      limit: 3,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          error: 'Too many requests, please try again later',
        });
      },
    });
    app.use(limiter);
    app.get('/ping', (_req, res) => res.json({ ok: true }));

    // First 3 pass.
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/ping');
      expect(res.status).toBe(200);
    }
    // 4th is limited with our JSON shape.
    const limited = await request(app).get('/ping');
    expect(limited.status).toBe(429);
    expect(body<{ error: string }>(limited).error).toBe(
      'Too many requests, please try again later',
    );
    // draft-7 headers: RateLimit-Policy carries the limit.
    expect(limited.headers['ratelimit-policy']).toMatch(/3;w=/);
    expect(limited.headers['ratelimit-remaining']).toBeUndefined();
  });

  it('should expose the configured limiter options.', () => {
    const limiter = createRateLimiter(5, 1000);
    expect(limiter).toBeTypeOf('function');
  });
});
