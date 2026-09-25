/**
 * Seeds an admin user from ADMIN_EMAIL / ADMIN_PASSWORD environment variables.
 *  re running updates the existing admin's password/role instead of failing.
 *  npm run seed
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pool from './db.js';

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Store Admin';

  if (!email || !password) {
    console.error('Seed failed: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Seed failed: ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert: create the admin, or refresh credentials if it already exists
    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (email)
      DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
      RETURNING id, name, email, role;
      `,
      [name, email, passwordHash]
    );

    const admin = result.rows[0];
    console.log(`Admin user ready: id=${admin.id} email=${admin.email} role=${admin.role}`);
    process.exit(0);
  } catch (err: any) {
    if (err?.code === '42P01') {
      console.error('Seed failed: the users table does not exist. Run the schema first (src/config/schema.sql).');
    } else {
      console.error('Seed failed:', err);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();
