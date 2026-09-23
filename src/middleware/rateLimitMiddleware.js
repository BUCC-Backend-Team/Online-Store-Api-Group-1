import { createClient } from 'redis';
// Initialize Redis Client
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));
// Connect to Redis (non-blocking)
redisClient.connect().catch((err) => console.error('Failed to connect to Redis:', err));
/**
 * Creates a rate-limiting middleware using Redis counters.
 * @param maxRequests Maximum number of requests allowed within the window.
 * @param windowSeconds Time window in seconds.
 */
export const rateLimiter = (maxRequests = 100, windowSeconds = 60) => {
    return async (req, res, next) => {
        // Fallback to IP address for identification
        const identifier = req.ip || req.socket.remoteAddress || 'anonymous';
        const key = `ratelimit:${identifier}`;
        try {
            // Increment request count for this identifier
            const currentRequests = await redisClient.incr(key);
            // If this is the first request in the window, set the expiration timer
            if (currentRequests === 1) {
                await redisClient.expire(key, windowSeconds);
            }
            // Check if the limit has been exceeded
            if (currentRequests > maxRequests) {
                res.status(429).json({
                    error: 'Too many requests, please try again later.',
                    retryAfterWindowSeconds: windowSeconds
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Rate limiter error (bypassing Redis):', error);
            // Fail open gracefully if Redis goes down so the app doesn't crash
            next();
        }
    };
};
//# sourceMappingURL=rateLimitMiddleware.js.map