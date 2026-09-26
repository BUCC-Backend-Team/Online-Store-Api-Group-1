import { createClient } from 'redis';

import EnvVars from '@src/common/constants/env';
import logger from '@src/common/utils/logger';

// Shared Redis client.
const client = createClient({
  socket: {
    host: EnvVars.Redis.Host,
    port: EnvVars.Redis.Port,
    connectTimeout: 5000,
    // Keep retrying forever, capped backoff.
    reconnectStrategy: (retries) => Math.min(retries * 200, 3000),
  },
  username: EnvVars.Redis.Username || undefined,
  password: EnvVars.Redis.Password || undefined,
  database: EnvVars.Redis.Db,
});

// Log connection errors instead of crashing the process.
client.on('error', (err) => logger.err('Redis error:', err));

let connecting: Promise<void> | null = null;
let lastAttempt = 0;
const RETRY_THROTTLE_MS = 5000;

// Connect if the client is not open. Safe to call repeatedly; throttled so
// requests don't hang on connect attempts when Redis is down.
async function ensureConnected(): Promise<void> {
  if (client.isOpen) return;
  if (!connecting) {
    if (Date.now() - lastAttempt < RETRY_THROTTLE_MS) {
      throw new Error('Redis unavailable');
    }
    lastAttempt = Date.now();
    connecting = client
      .connect()
      .then(() => logger.info({ type: 'cache', event: 'redis_connected' }))
      .finally(() => {
        connecting = null;
      });
  }
  await connecting;
}

// Fail fast on startup if Redis is unreachable.
async function connectRedis(): Promise<void> {
  await ensureConnected();
  await client.ping();
}

// Close the connection (graceful shutdown).
async function closeRedis(): Promise<void> {
  if (client.isOpen) {
    await client.quit();
  }
}

export default { client, ensureConnected, connectRedis, closeRedis } as const;
