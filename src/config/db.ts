import { Pool } from 'pg';
import {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DATABASE_URL
} from './env.js';

// Env is loaded by src/config/env.ts (single source of truth)

const pool = new Pool(
  DATABASE_URL
    ? { connectionString: DATABASE_URL }
    : {
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME
      }
);

pool.on('connect', () => {
  console.log('Connected to the database');
});

// Without this, an idle-client error (DB restart, network drop) crashes the process
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

/**
 * Fail-fast connectivity check for server startup.
 * Throws if the database is unreachable or credentials are wrong.
 */
export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
export { pool };
export default pool;