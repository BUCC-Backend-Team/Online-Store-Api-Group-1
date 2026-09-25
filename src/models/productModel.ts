import pool from '../config/db.js';

export interface ProductRow {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock: number;
  created_at: Date;
}

export interface ProductFilters {
  search?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  limit: number;
  offset: number;
}

export const createProduct = async (
  name: string,
  sku: string,
  price: number,
  stock: number
): Promise<ProductRow> => {
  const result = await pool.query(
    `INSERT INTO products (name, sku, price, stock)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, sku, price, stock, created_at`,
    [name, sku, price, stock]
  );
  return result.rows[0];
};

export const getProductById = async (id: number): Promise<ProductRow | null> => {
  const result = await pool.query(
    `SELECT id, name, sku, price, stock, created_at FROM products WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const getFilteredProducts = async ({
  search,
  minPrice,
  maxPrice,
  limit,
  offset
}: ProductFilters): Promise<{ products: ProductRow[]; total: number }> => {
  let baseQuery = `SELECT * FROM products WHERE 1=1`;
  let countQuery = `SELECT COUNT(*) AS count FROM products WHERE 1=1`;
  const values: any[] = [];
  let paramIndex = 1;

  if (search) {
    baseQuery += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
    countQuery += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
    // Escape LIKE wildcards so user input like "%" or "_" is matched literally
    const escaped = search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    values.push(`%${escaped}%`);
    paramIndex++;
  }

  if (minPrice !== undefined) {
    baseQuery += ` AND price >= $${paramIndex}`;
    countQuery += ` AND price >= $${paramIndex}`;
    values.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
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
    total: parseInt(countResult.rows[0].count, 10)
  };
};
