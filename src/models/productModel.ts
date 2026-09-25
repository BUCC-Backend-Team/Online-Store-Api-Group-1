import pool from '../config/db.js';

export interface Product {
  id?: number;
  name: string;
  sku?: string;
  price: number;
  stock: number;
  created_at?: Date;
}

export const createProduct = async (
  name: string,
  sku: string,
  price: number,
  stock: number
): Promise<Product> => {
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

export const getFilteredProducts = async (
  search?: string,
  minPrice?: number,
  maxPrice?: number,
  limit: number = 10,
  offset: number = 0
): Promise<{ products: Product[]; total: number }> => {
  let baseQuery = `SELECT * FROM products WHERE 1=1`;
  let countQuery = `SELECT COUNT(*) FROM products WHERE 1=1`;
  const values: any[] = [];
  let paramIndex = 1;

  if (search) {
    baseQuery += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
    countQuery += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  if (minPrice !== undefined && !isNaN(minPrice)) {
    baseQuery += ` AND price >= $${paramIndex}`;
    countQuery += ` AND price >= $${paramIndex}`;
    values.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined && !isNaN(maxPrice)) {
    baseQuery += ` AND price <= $${paramIndex}`;
    countQuery += ` AND price <= $${paramIndex}`;
    values.push(maxPrice);
    paramIndex++;
  }

  baseQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limit, offset);

  const [productsResult, countResult] = await Promise.all([
    pool.query(baseQuery, values),
    pool.query(countQuery, values.slice(0, paramIndex - 1))
  ]);

  return {
    products: productsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};