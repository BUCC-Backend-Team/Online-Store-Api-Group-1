import { createClient } from 'redis';
// Initialize Redis client for security tracking
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Lockout Error:', err));

// Connect if not already connected
if (!redisClient.isOpen) {
  redisClient.connect().catch(console.error);
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_SECONDS = 900; // 15 minutes (in seconds)

// 1. Check if an account is currently locked out
export async function checkAccountLockout(email: string): Promise<boolean> {
  try {
    const lockoutKey = `lockout:${email}`;
    const isLocked = await redisClient.get(lockoutKey);
    return !!isLocked;
  } catch (error) {
    console.error('Lockout check failed, allowing request safely:', error);
    return false; // Fail-safe: don't block users if Redis hiccups
  }
}

// 2. Track a failed login attempt and lock if threshold is met
export async function handleFailedLogin(email: string): Promise<void> {
  try {
    const attemptsKey = `attempts:${email}`;
    const lockoutKey = `lockout:${email}`;

    const attempts = await redisClient.incr(attemptsKey);
    if (attempts === 1) {
      await redisClient.expire(attemptsKey, LOCKOUT_TIME_SECONDS);
    }

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await redisClient.set(lockoutKey, 'LOCKED', { EX: LOCKOUT_TIME_SECONDS });
      await redisClient.del(attemptsKey); // Clear the attempts counter
    }
  } catch (error) {
    console.error('Failed login tracking error:', error);
  }
}

// 3. Clear failed attempts on a successful login
export async function resetFailedLogins(email: string): Promise<void> {
  try {
    await redisClient.del(`attempts:${email}`);
    await redisClient.del(`lockout:${email}`);
  } catch (error) {
    console.error('Reset failed logins error:', error);
  }
}