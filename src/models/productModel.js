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
//# sourceMappingURL=productModel.js.map