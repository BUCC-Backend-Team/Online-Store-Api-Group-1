import { type Request, type Response, type NextFunction } from 'express';
import { redisClient } from '../config/redis.js';

interface RateLimiterOptions {
  /** Size of the fixed window in milliseconds */
  windowMs: number;
  /** Max requests allowed per window, per client IP */
  max: number;
  /** Prefix for Redis keys, e.g. "ratelimit:auth" */
  keyPrefix: string;
}

/**
 * Fixed-window rate limiter backed by the shared Redis client.
 * Mechanics mirror handleFailedLogin in lockoutMiddleware.ts:
 * INCR the counter, EXPIRE on first hit, compare against max.
 *
 * Fails open on Redis errors (same policy as the lockout middleware)
 * so a cache outage never takes down the API.
 */
export const rateLimiter = ({ windowMs, max, keyPrefix }: RateLimiterOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `ratelimit:${keyPrefix}:${req.ip || 'unknown'}`;

      const count = await redisClient.incr(key);

      if (count === 1) {
        // First request in this window: start the expiry clock
        await redisClient.pexpire(key, windowMs);
      }

      // Standard rate limit headers (RateLimit-* draft + Retry-After on 429)
      const resetSeconds = Math.max(1, Math.ceil(await redisClient.pttl(key) / 1000));
      const remaining = Math.max(0, max - count);

      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(resetSeconds));

      if (count > max) {
        res.setHeader('Retry-After', String(resetSeconds));
        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.'
        });
        return;
      }

      next();
    } catch (error) {
      // Fail open: log and let the request through
      console.error('Rate limiter error:', error);
      next();
    }
  };
};

// ---- Preconfigured limiters overridable via env vars ----

// Strict: brute-forceable endpoints register/login/refresh  10 requests per 15 min
export const authRateLimiter = rateLimiter({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  keyPrefix: 'auth'
});

// General: all other API routes  100 requests per 15 min
export const generalRateLimiter = rateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  keyPrefix: 'general'
});
