import pool from '../config/db.js';

export interface User {
  id?: number;
  name: string;
  email: string;
  password_hash: string;
  role?: string;
  created_at?: Date;
  refresh_token?: string | null;
}

// Shape of a row as returned by the database (NOT NULL columns are guaranteed)
export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
  refresh_token: string | null;
}

export const createUser = async (name: string, email: string, passwordHash: string, role = 'customer'): Promise<User> => {
  const query = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at;
  `;
  const values = [name, email, passwordHash, role];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const query = `SELECT * FROM users WHERE email = $1;`;
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

export const findUserById = async (id: number): Promise<UserRow | null> => {
  const query = `
    SELECT id, name, email, role, created_at, refresh_token
    FROM users WHERE id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const setRefreshToken = async (id: number, refreshToken: string | null): Promise<void> => {
  const query = `UPDATE users SET refresh_token = $1 WHERE id = $2;`;
  await pool.query(query, [refreshToken, id]);
};