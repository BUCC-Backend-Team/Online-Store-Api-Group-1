
import pool from '../config/db.js';

export interface CartItem {
  productId: number;
  quantity: number;
}

export const createOrder = async (userId: number, items: CartItem[]) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into orders table first
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *',
      [userId, 'pending']
    );
    const newOrder = orderResult.rows[0];

    let totalAmount = 0;

    // 2. Loop through cart items, verify prices, stock, and insert order items
    for (const item of items) {
      const productResult = await client.query('SELECT price, stock FROM products WHERE id = $1', [item.productId]);
      
      if (productResult.rows.length === 0) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      const product = productResult.rows[0];
      
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.productId}`);
      }

      const itemTotal = Number(product.price) * item.quantity;
      totalAmount += itemTotal;

      // Insert into order_items
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
        [newOrder.id, item.productId, item.quantity]
      );

      // Deduct stock from products table
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
    }

    // 3. Create a corresponding payment record matching your payments table schema
    await client.query(
      'INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, $3)',
      [newOrder.id, totalAmount, 'pending']
    );

    await client.query('COMMIT');
    return { ...newOrder, totalAmount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getOrdersByUserId = async (userId: number) => {
  const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return result.rows;
};