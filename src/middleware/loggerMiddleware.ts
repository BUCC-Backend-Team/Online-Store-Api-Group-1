import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export const structuredLogger = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Generate or retrieve a correlation ID for request tracing
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const startTimes = process.hrtime();

  // 2. Capture response completion to log status and duration
  res.on('finish', () => {
    const diff = process.hrtime(startTimes);
    const responseTimeMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    const logData = {
      timestamp: new Date().toISOString(),
      correlationId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTimeMs: `${responseTimeMs}ms`,
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip || req.socket.remoteAddress
    };

    // Output structured JSON log
    console.log(JSON.stringify(logData));
  });

  next();
};