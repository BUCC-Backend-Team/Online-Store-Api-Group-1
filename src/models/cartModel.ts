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

/**
 * Adds an item to the cart in one transaction with a row lock on the product,
 * so concurrent adds can't oversell past available stock.
 * Throws CartError(409) when requested quantity exceeds stock.
 */
export class CartError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const addItemToCart = async (
  userId: number,
  productId: number,
  quantity: number
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the product row so concurrent cart writes for it serialize
    const productResult = await client.query(
      `SELECT stock FROM products WHERE id = $1 FOR UPDATE`,
      [productId]
    );
    const product = productResult.rows[0];

    if (!product) {
      throw new CartError('Product not found.', 404);
    }

    const existingResult = await client.query(
      `SELECT quantity FROM carts WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );
    const currentQty = existingResult.rows[0]?.quantity ?? 0;

    if (currentQty + quantity > product.stock) {
      throw new CartError(
        `Insufficient stock: requested ${currentQty + quantity}, available ${product.stock}.`,
        409
      );
    }

    await client.query(
      `INSERT INTO carts (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = carts.quantity + EXCLUDED.quantity`,
      [userId, productId, quantity]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Updates a cart item quantity in one transaction, guarded against available stock
 * (previously missing, letting users set quantity above stock).
 * Returns false if the item is not in the cart; throws CartError(409) on insufficient stock.
 */
export const updateCartItem = async (
  userId: number,
  productId: number,
  quantity: number
): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      `SELECT stock FROM products WHERE id = $1 FOR UPDATE`,
      [productId]
    );
    const product = productResult.rows[0];

    if (!product) {
      throw new CartError('Product not found.', 404);
    }

    const result = await client.query(
      `UPDATE carts SET quantity = $3
       WHERE user_id = $1 AND product_id = $2 AND quantity <= $4
       RETURNING id`,
      [userId, productId, quantity, product.stock]
    );

    if ((result.rowCount ?? 0) === 0) {
      // Distinguish "not in cart" from "over stock" for the right status code
      const existsResult = await client.query(
        `SELECT 1 FROM carts WHERE user_id = $1 AND product_id = $2`,
        [userId, productId]
      );
      if ((existsResult.rowCount ?? 0) === 0) {
        await client.query('COMMIT');
        return false;
      }
      throw new CartError(
        `Insufficient stock: requested ${quantity}, available ${product.stock}.`,
        409
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
