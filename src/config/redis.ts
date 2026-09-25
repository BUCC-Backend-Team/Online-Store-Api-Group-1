import RedisMock from 'ioredis-mock';

/**
 * Shared Redis client for the whole app (lockout + rate limiting).
 *
 * Development/testing uses ioredis-mock (in-memory, per-process).
 * For production, replace with a real client:
 *   import Redis from 'ioredis';
 *   const redisClient = new Redis(process.env.REDIS_URL);
 *
 * Note: the mock is per-process — counters are not shared across
 * cluster nodes and reset when the server restarts.
 */
export const redisClient = new RedisMock();
