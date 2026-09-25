import { redisClient } from '../config/redis.js';
import { LOCKOUT_MAX_ATTEMPTS, LOCKOUT_WINDOW_SECONDS } from '../config/env.js';

/**
 * Account lockout helpers backed by Redis (INCR + EXPIRE, mirrors the rate limiter).
 *
 * Keys: lockout:<identifier> = number of failed attempts, expiring after
 * LOCKOUT_WINDOW_SECONDS (default 900 = 15 minutes, matching the login message).
 */
export const checkAccountLockout = async (identifier: string): Promise<boolean> => {
  try {
    const attempts = await redisClient.get(`lockout:${identifier}`);
    return attempts ? parseInt(attempts, 10) >= LOCKOUT_MAX_ATTEMPTS : false;
  } catch (err) {
    console.error('Check lockout error:', err);
    return false; // Fail open
  }
};

export const handleFailedLogin = async (identifier: string): Promise<void> => {
  try {
    const key = `lockout:${identifier}`;
    const attempts = await redisClient.incr(key);
    if (attempts === 1) {
      await redisClient.expire(key, LOCKOUT_WINDOW_SECONDS);
    }
  } catch (err) {
    console.error('Handle failed login error:', err);
  }
};

export const resetFailedLogins = async (identifier: string): Promise<void> => {
  try {
    await redisClient.del(`lockout:${identifier}`);
  } catch (err) {
    console.error('Reset failed logins error:', err);
  }
};
