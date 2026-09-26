import { Pool } from 'pg';

import db from '@src/config/db';
import { IUser, UserRole } from '@src/models/User.model';

// A row from the users table.
interface IUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string | Date;
}

// Convert a DB row to an IUser (snake_case -> camelCase).
function rowToUser(row: IUserRow): IUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: new Date(row.created_at),
  };
}

// Get a user by id.
export async function getById(id: string): Promise<IUser | null> {
  const { rows } = await db.pool.query<IUserRow>(
    'SELECT * FROM users WHERE id = $1',
    [id],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

// Get a user by email.
export async function getByEmail(email: string): Promise<IUser | null> {
  const { rows } = await db.pool.query<IUserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

// Get all users (admin).
export async function getAll(): Promise<IUser[]> {
  const { rows } = await db.pool.query<IUserRow>(
    'SELECT * FROM users ORDER BY created_at DESC',
  );
  return rows.map(rowToUser);
}

// Create a user with a hashed password.
export async function create(
  name: string,
  email: string,
  passwordHash: string,
  role: UserRole,
): Promise<IUser> {
  const { rows } = await db.pool.query<IUserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, email.toLowerCase(), passwordHash, role],
  );
  return rowToUser(rows[0]);
}

// Update a user's profile fields.
export async function updateProfile(
  id: string,
  fields: { name?: string; email?: string },
): Promise<IUser | null> {
  const { rows } = await db.pool.query<IUserRow>(
    `UPDATE users SET
       name = COALESCE($2, name),
       email = COALESCE($3, email)
     WHERE id = $1
     RETURNING *`,
    [id, fields.name ?? null, fields.email?.toLowerCase() ?? null],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

// Delete a user by id, returns whether a row was removed.
export async function remove(id: string): Promise<boolean> {
  const { rowCount } = await db.pool.query(
    'DELETE FROM users WHERE id = $1',
    [id],
  );
  return rowCount === 1;
}

// Count users (used to keep the seeded admin unique).
export async function countAdmins(pool?: Pool): Promise<number> {
  const client = pool ?? db.pool;
  const { rows } = await client.query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'",
  );
  return parseInt(rows[0].count, 10);
}

export default {
  getById,
  getByEmail,
  getAll,
  create,
  updateProfile,
  remove,
  countAdmins,
} as const;
