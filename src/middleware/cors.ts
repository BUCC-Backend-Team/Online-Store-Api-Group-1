import cors from 'cors';
import { Request } from 'express';

import EnvVars from '@src/common/constants/env';
import logger from '@src/common/utils/logger';

// Allowed origins from env (comma-separated). Empty means dev mode: reflect
// whatever origin the request came from. The refresh cookie is SameSite=strict
// so cross-origin clients need credentials support.
function isAllowed(origin: string): boolean {
  const raw = EnvVars.Cors.Origins?.trim() ?? '';
  if (raw === '') return true; // dev: allow any origin
  return raw.split(',').map((o) => o.trim()).includes(origin);
}

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin(origin: string | undefined, callback) {
    // Non-browser tools (curl, tests) send no Origin; allow those.
    if (!origin) {
      callback(null, true);
      return;
    }
    if (isAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn({
        type: 'security',
        event: 'cors_rejected',
        origin,
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

export function corsFor(_req: Request): cors.CorsOptions {
  return corsOptions;
}

export default cors(corsOptions);
