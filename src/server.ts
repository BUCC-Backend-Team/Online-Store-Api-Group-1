import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import logger from '@src/common/utils/logger';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import BaseRouter from '@src/routes';
import ApiError from '@src/common/utils/errors';
import { requestLogger } from '@src/middleware/requestLogger';
import corsMiddleware from '@src/middleware/cors';
import { generalLimiter, authLimiter } from '@src/middleware/rateLimit';

import EnvVars, { NodeEnvs } from './common/constants/env';

const app = express();

// Basic middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Structured request logging (skip morgan in dev; JSON logger covers it)
app.use(requestLogger);
if (EnvVars.NodeEnv === NodeEnvs.DEV) {
  app.use(morgan('dev'));
}

// Security headers in production
if (EnvVars.NodeEnv === NodeEnvs.PRODUCTION) {
  app.use(helmet());
}

// API routes, with per-IP rate limiting (stricter on auth)
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', BaseRouter);

// Not found
app.use((_: Request, res: Response) => {
  res
    .status(HttpStatusCodes.NOT_FOUND)
    .json({ error: 'Route not found' });
});

// Error handler. `_next` must stay: Express only treats 4-arg middleware
// as an error handler.
app.use((err: Error, _: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    // Expected errors: 4xx logged at warn by requestLogger, no stack dump.
    if (err.status >= 500) {
      logger.err({ type: 'error', ...err.toResponse(), status: err.status });
    }
    return res.status(err.status).json(err.toResponse());
  }
  logger.err({
    type: 'error',
    message: err.message,
    stack: EnvVars.NodeEnv === NodeEnvs.PRODUCTION ? undefined : err.stack,
  });
  return res
    .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
    .json({ error: 'Internal Server Error' });
});

export default app;
