/**
 * Applies the database schema + indexes using Node (no psql CLI required).
 * Idempotent: safe to run multiple times. Creates the database if missing
 * (when the connected user has permission — typically on localhost).
 *
 *   npm run db:migrate
 */
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run(): Promise<void> {
  const targetDb = DB_NAME;
  if (!targetDb) {
    console.error('db:migrate failed: DB_NAME is not set in .env');
    process.exit(1);
  }

  // 1. Connect to the maintenance DB first and create the target DB if missing
  const admin = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await admin.connect();
    const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]);
    if ((exists.rowCount ?? 0) === 0) {
      // Identifier cannot be parameterized; quote it defensively
      await admin.query(`CREATE DATABASE "${targetDb.replace(/"/g, '')}"`);
      console.log(`Created database "${targetDb}"`);
    }
  } catch (err: any) {
    // Permission denied or remote DB without CREATE DATABASE rights: assume DB exists
    console.warn(`Skipping database creation check: ${err?.message ?? err}`);
  } finally {
    await admin.end();
  }

  // 2. Connect to the target DB and apply schema + indexes
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: targetDb
  });

  try {
    await client.connect();
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schema = await readFile(schemaPath, 'utf8');
    await client.query(schema);
    console.log(`Schema applied to "${targetDb}" from ${path.relative(process.cwd(), schemaPath)}`);
    console.log('Migration complete.');
  } catch (err) {
    console.error('db:migrate failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

void run();
