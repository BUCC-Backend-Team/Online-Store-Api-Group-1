
import pool from '../config/db.js';

export interface Product {
  id?: number;
  name: string;
  sku?: string;
  price: number;
  stock: number;
  created_at?: Date;
}

export const createProduct = async (name: string, sku: string, price: number, stock: number): Promise<Product> => {
  const query = `
    INSERT INTO products (name, sku, price, stock)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, sku, price, stock, created_at;
  `;
  const values = [name, sku, price, stock];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getAllProducts = async (): Promise<Product[]> => {
  const query = `SELECT * FROM products ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
};