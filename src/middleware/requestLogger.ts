import { Request, Response, NextFunction } from 'express';

import logger from '@src/common/utils/logger';

// Structured log line per request. Warn level for client errors, error level
// for server errors.
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  res.on('finish', () => {
    const entry = {
      type: 'request',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    };

    if (res.statusCode >= 500) {
      logger.err(entry);
    } else if (res.statusCode >= 400) {
      logger.warn(entry);
    } else {
      logger.info(entry);
    }
  });

  next();
}
