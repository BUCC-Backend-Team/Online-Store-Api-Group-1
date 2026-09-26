import logger from '@src/common/utils/logger';

import EnvVars, { NodeEnvs } from './common/constants/env';
import db from './config/db';
import redis from './config/redis';
import server from './server';
import { ensureAdminUser } from './repos/adminSeed';
import fs from 'fs';
import path from 'path';

// Close connections and exit.
async function shutdown(code: number): Promise<never> {
  try {
    await redis.closeRedis();
  } catch (err) {
    logger.err('Error while closing Redis:', err);
  }
  try {
    await db.closeDb();
  } catch (err) {
    logger.err('Error while closing database pool:', err);
  }
  return process.exit(code);}

// Run pending DDL (idempotent).
async function runMigrations(): Promise<void> {
  const schemaPath = path.join(__dirname, 'config', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const ddl = fs.readFileSync(schemaPath, 'utf8');
    await db.pool.query(ddl);
  }
}

// Connect to the database and Redis first, then listen.
async function startServer(): Promise<void> {
  try {
    await db.connectDb();
    logger.imp('Database connection established.');
  } catch (err) {
    logger.err('Database connection failed:', err);
    throw err;
  }
  try {
    await redis.connectRedis();
    logger.imp('Redis connection established.');
  } catch (err) {
    logger.err('Redis connection failed:', err);
    throw err;
  }
  await runMigrations();
  await ensureAdminUser();
  server.listen(EnvVars.Port, (err) => {
    if (!!err) {
      logger.err(err.message);
    } else {
      logger.imp('Express server started on port: ' + EnvVars.Port);
    }
  });
}

if (EnvVars.NodeEnv !== NodeEnvs.TEST) {
  startServer().catch(() => shutdown(1));

  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));
}

export { startServer, shutdown };
