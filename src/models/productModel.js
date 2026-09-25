import pool from '../config/db.js';
export const createProduct = async (name, sku, price, stock) => {
    const query = `
    INSERT INTO products (name, sku, price, stock)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, sku, price, stock, created_at;
  `;
    const values = [name, sku, price, stock];
    const result = await pool.query(query, values);
    return result.rows[0];
};
export const getAllProducts = async () => {
    const query = `SELECT * FROM products ORDER BY created_at DESC;`;
    const result = await pool.query(query);
    return result.rows;
};
export const getFilteredProducts = async (search, minPrice, maxPrice, limit = 10, offset = 0) => {
    let baseQuery = `SELECT * FROM products WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM products WHERE 1=1`;
    const values = [];
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
//# sourceMappingURL=productModel.js.map