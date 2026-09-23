import type { Request, Response, NextFunction } from 'express';
/**
 * Creates a rate-limiting middleware using Redis counters.
 * @param maxRequests Maximum number of requests allowed within the window.
 * @param windowSeconds Time window in seconds.
 */
export declare const rateLimiter: (maxRequests?: number, windowSeconds?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rateLimitMiddleware.d.ts.map