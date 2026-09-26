import { Pool } from 'pg';

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

export default { pool, connectDb, closeDb } as const;
