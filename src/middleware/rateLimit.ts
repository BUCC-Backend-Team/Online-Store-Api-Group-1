import { NextFunction, Request, Response } from 'express';
import rateLimit, { Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import EnvVars from '@src/common/constants/env';
import logger from '@src/common/utils/logger';
import redis from '@src/config/redis';

// Counted per IP in the shared Redis store so limits hold across restarts
// and multiple instances. The wrapper swallows Redis errors by returning 0
// hits (express-rate-limit treats 0 as "no count yet" and continues) so a
// Redis outage never takes the API down.
function makeStore(windowMs: number) {
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      try {
        await redis.ensureConnected();
        return (await redis.client.sendCommand(args)) as unknown as string[];
      } catch (err) {
        logger.warn({
          type: 'security',
          event: 'rate_limit_store_error',
          message: (err as Error).message,
        });
        // Reply shape for the increment script: [totalHits, pttl].
        return ['0', '0'];
      }
    },
    prefix: 'rl:',
    // expiry: Math.ceil(windowMs / 1000),
  });
}

// JSON 429 body, consistent with the rest of the API.
function handler(req: Request, res: Response): void {
  logger.warn({
    type: 'security',
    event: 'rate_limited',
    ip: req.ip,
    path: req.originalUrl,
  });
  res.status(429).json({
    error: 'Too many requests, please try again later',
  });
}

// Factory so tests can create limiters with a small max/window.
export function createRateLimiter(
  max: number,
  windowMs = EnvVars.RateLimit.WindowMinutes * 60 * 1000,
) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
    // No throttling in test env; suites make many auth calls.
    skip: () => EnvVars.NodeEnv === 'test',
    // Never let a limiter error kill a request.
    passOnStoreError: true,
    ...(EnvVars.NodeEnv !== 'test' ? { store: makeStore(windowMs) } : {}),
  });
}

// General limiter for every /api route.
export const generalLimiter = createRateLimiter(EnvVars.RateLimit.GeneralMax);

// Stricter limiter for /api/auth to slow credential stuffing.
export const authLimiter = createRateLimiter(EnvVars.RateLimit.AuthMax);

export default { createRateLimiter, generalLimiter, authLimiter };
