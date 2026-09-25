import pool from '../config/db.js';

export interface CheckoutItem {
  productId: number;
  quantity: number;
}

export interface OrderItem {
  product_id: number;
  name: string;
  quantity: number;
  price: string;
}

export interface OrderRecord {
  id: number;
  user_id: number;
  total_amount: string;
  status: string;
  created_at: Date;
}

export interface OrderWithItems extends OrderRecord {
  items: OrderItem[];
}

// Thrown for expected business failures (empty cart, insufficient stock)
export class CheckoutError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Creates an order from the user's cart in one transaction: locks cart rows,
// prices server-side from the products table, guards stock, clears the cart.
export const createOrderFromCart = async (userId: number): Promise<OrderRecord> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cartResult = await client.query(
      `SELECT c.product_id, c.quantity, p.price, p.stock, p.name
       FROM carts c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1
       ORDER BY c.product_id
       FOR UPDATE OF c`,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      throw new CheckoutError('Cart is empty.', 400);
    }

    const totalAmount = cartResult.rows.reduce(
      (sum: number, row: any) => sum + Number(row.price) * row.quantity,
      0
    );

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, status, created_at)
       VALUES ($1, $2, 'Pending', NOW())
       RETURNING id, user_id, total_amount, status, created_at`,
      [userId, totalAmount]
    );
    const order = orderResult.rows[0] as OrderRecord;

    for (const row of cartResult.rows) {
      const stockResult = await client.query(
        `UPDATE products
         SET stock = stock - $1
         WHERE id = $2 AND stock >= $1
         RETURNING id`,
        [row.quantity, row.product_id]
      );

      if (stockResult.rowCount === 0) {
        throw new CheckoutError(
          `Insufficient stock for "${row.name}". Available: ${row.stock}, requested: ${row.quantity}.`,
          409
        );
      }

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, row.product_id, row.quantity, row.price]
      );
    }

    await client.query('DELETE FROM carts WHERE user_id = $1', [userId]);

    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getOrdersByUserId = async (userId: number): Promise<OrderRecord[]> => {
  const result = await pool.query(
    `SELECT id, user_id, total_amount, status, created_at
     FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getOrderDetailsById = async (
  orderId: number,
  userId: number,
  isAdmin: boolean
): Promise<OrderWithItems | null> => {
  let orderQuery = `SELECT id, user_id, total_amount, status, created_at FROM orders WHERE id = $1`;
  const params: any[] = [orderId];

  if (!isAdmin) {
    orderQuery += ` AND user_id = $2`;
    params.push(userId);
  }

  const orderResult = await pool.query(orderQuery, params);
  if (orderResult.rows.length === 0) return null;

  const itemsResult = await pool.query(
    `SELECT oi.product_id, p.name, oi.quantity, oi.price
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  return { ...orderResult.rows[0], items: itemsResult.rows };
};
