import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import logger from '@src/common/utils/logger';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import BaseRouter from '@src/routes';
import { ApiError } from '@src/common/utils/errors';

import EnvVars, { NodeEnvs } from './common/constants/env';

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging in development
if (EnvVars.NodeEnv === NodeEnvs.DEV) {
  app.use(morgan('dev'));
}

// Security headers in production
if (EnvVars.NodeEnv === NodeEnvs.PRODUCTION) {
  app.use(helmet());
}

// API routes
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
    return res.status(err.status).json({ error: err.message });
  }
  if (EnvVars.NodeEnv !== NodeEnvs.TEST) {
    logger.err(err);
  }
  return res
    .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
    .json({ error: 'Internal Server Error' });
});

export default app;
