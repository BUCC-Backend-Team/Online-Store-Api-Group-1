import { createClient } from 'redis';

import EnvVars from '@src/common/constants/env';
import logger from '@src/common/utils/logger';

// Shared Redis client.
const client = createClient({
  socket: {
    host: EnvVars.Redis.Host,
    port: EnvVars.Redis.Port,
  },
  username: EnvVars.Redis.Username || undefined,
  password: EnvVars.Redis.Password || undefined,
  database: EnvVars.Redis.Db,
});

// Log connection errors instead of crashing the process.
client.on('error', (err) => logger.err('Redis error:', err));

// Fail fast on startup if Redis is unreachable.
async function connectRedis(): Promise<void> {
  await client.connect();
  await client.ping();
}

// Close the connection (graceful shutdown, tests).
async function closeRedis(): Promise<void> {
  await client.quit();
}

export default { client, connectRedis, closeRedis } as const;
