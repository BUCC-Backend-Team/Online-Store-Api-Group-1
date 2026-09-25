import { isProd, REDIS_URL } from './env.js';
import { Redis } from 'ioredis';

/**
 * Shared Redis client for the whole app (lockout + rate limiting + caching).
 *
 * - Production: real ioredis client from REDIS_URL (required in prod).
 * - Development: ioredis-mock (in-memory, per-process). Counters reset on
 *   restart and are not shared across cluster nodes.
 */
let redisClient: Redis;

if (isProd) {
  if (!REDIS_URL) {
    console.error('[redis] REDIS_URL is required in production.');
    process.exit(1);
  }
  redisClient = new Redis(REDIS_URL);
  redisClient.on('error', (err) => {
    console.error('[redis] Redis error:', err.message);
  });
} else {
  const { default: RedisMock } = await import('ioredis-mock');
  redisClient = new RedisMock() as unknown as Redis;
}

export { redisClient };
