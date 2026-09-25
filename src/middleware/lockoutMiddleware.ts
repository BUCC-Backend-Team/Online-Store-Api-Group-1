import { type Request, type Response, type NextFunction } from 'express';
import { redisClient } from '../config/redis.js';

// 1. The main middleware function
export const lockoutMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    next();
  } catch (error) {
    console.error('Redis Lockout Error:', error);
    next();
  }
};

// 2. Helper functions expected by your authController.ts
export const checkAccountLockout = async (identifier: string): Promise<boolean> => {
  try {
    const attempts = await redisClient.get(`lockout:${identifier}`);
    return attempts ? parseInt(attempts) >= 5 : false;
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
      await redisClient.expire(key, 300); // Lock for 5 minutes after first fail
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