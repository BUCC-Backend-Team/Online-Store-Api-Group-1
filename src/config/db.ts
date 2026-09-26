import { Pool, PoolClient } from 'pg';

import EnvVars from '@src/common/constants/env';

// Shared connection pool.
const pool = new Pool({
  host: EnvVars.Db.Host,
  port: EnvVars.Db.Port,
  user: EnvVars.Db.User,
  password: EnvVars.Db.Password,
  database: EnvVars.Db.Name,
  ssl: EnvVars.Db.Ssl ? { rejectUnauthorized: false } : false,
});

// Fail fast on startup if the database is unreachable.
async function connectDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

// Close the pool (graceful shutdown, tests).
async function closeDb(): Promise<void> {
  await pool.end();
}

// Run `fn` inside a transaction; rolls back when it throws.
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default { pool, connectDb, closeDb, withTransaction } as const;
