import { Request, Response } from 'express';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import db from '@src/config/db';
import redis from '@src/config/redis';

// GET /api/health — public probe of the services this API depends on.
// 200 while the database is up (Redis down only degrades to 'degraded'),
// 503 when the database is unreachable.
export async function check(_req: Request, res: Response): Promise<void> {
  const checks = await Promise.allSettled([
    db.pool.query('SELECT 1'),
    (async () => {
      await redis.ensureConnected();
      await redis.client.ping();
    })(),
  ]);

  const database = checks[0].status === 'fulfilled' ? 'up' : 'down';
  const cache = checks[1].status === 'fulfilled' ? 'up' : 'down';

  const payload = {
    status: database === 'up' ? 'ok' : 'error',
    uptime: Math.round(process.uptime()),
    services: { database, cache },
    timestamp: new Date().toISOString(),
  };

  if (database === 'down') {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(payload);
    return;
  }
  res.status(HttpStatusCodes.OK).json(payload);
}
