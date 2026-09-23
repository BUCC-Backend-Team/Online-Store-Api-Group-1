import pool from '../config/db.js';

export interface User {
  id?: number;
  name: string;
  email: string;
  password_hash: string;
  role?: string;
  created_at?: Date;
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

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const query = `SELECT * FROM users WHERE email = $1;`;
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};