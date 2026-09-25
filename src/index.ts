import app from './app.js';
import { checkDatabaseConnection, pool } from './config/db.js';
import { PORT, isProd } from './config/env.js';

async function start(): Promise<void> {
  // Fail fast: verify DB credentials before accepting traffic
  try {
    await checkDatabaseConnection();
    console.log('Database connection verified');
  } catch (error) {
    console.error('FATAL: could not connect to the database:', error);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });

  // Graceful shutdown: stop accepting connections, close DB pool
  const shutdown = async (signal: string) => {
    console.log(`${signal} received — shutting down`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    // Force-exit if close hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void start();
