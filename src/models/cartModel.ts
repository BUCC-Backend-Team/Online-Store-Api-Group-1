import pool from '../config/db.js';

export interface CartItemRow {
  product_id: number;
  name: string;
  price: string;
  quantity: number;
  stock: number;
}

export const getCartByUserId = async (userId: number): Promise<CartItemRow[]> => {
  const result = await pool.query(
    `SELECT c.product_id, p.name, p.price, c.quantity, p.stock
     FROM carts c
     JOIN products p ON p.id = c.product_id
     WHERE c.user_id = $1
     ORDER BY c.created_at`,
    [userId]
  );
  return result.rows;
};

export const addItemToCart = async (
  userId: number,
  productId: number,
  quantity: number
): Promise<void> => {
  await pool.query(
    `INSERT INTO carts (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = carts.quantity + EXCLUDED.quantity`,
    [userId, productId, quantity]
  );
};

export const updateCartItem = async (
  userId: number,
  productId: number,
  quantity: number
): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE carts SET quantity = $3 WHERE user_id = $1 AND product_id = $2`,
    [userId, productId, quantity]
  );
  return (result.rowCount ?? 0) > 0;
};

export const removeCartItem = async (userId: number, productId: number): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM carts WHERE user_id = $1 AND product_id = $2`,
    [userId, productId]
  );
  return (result.rowCount ?? 0) > 0;
};

export const clearCart = async (userId: number): Promise<void> => {
  await pool.query(`DELETE FROM carts WHERE user_id = $1`, [userId]);
};
