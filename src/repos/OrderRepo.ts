import { PoolClient } from 'pg';

import db from '@src/config/db';
import {
  IOrder,
  IOrderItem,
  IOrderWithItems,
  OrderStatus,
  OrderStatuses,
} from '@src/models/Order.model';

interface IOrderRow {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: string;
  created_at: string | Date;
  updated_at: string | Date;
}

interface IOrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
}

function rowToOrder(row: IOrderRow): IOrder {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    total: row.total,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToItem(row: IOrderItemRow): IOrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    unitPrice: row.unit_price,
    quantity: row.quantity,
  };
}

// Get an order with its items.
export async function getByIdWithItems(
  id: string,
  client?: PoolClient,
): Promise<IOrderWithItems | null> {
  const executor = client ?? db.pool;
  const { rows } = await executor.query<IOrderRow>(
    'SELECT * FROM orders WHERE id = $1',
    [id],
  );
  if (!rows[0]) return null;
  const { rows: itemRows } = await executor.query<IOrderItemRow>(
    'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC',
    [id],
  );
  return { ...rowToOrder(rows[0]), items: itemRows.map(rowToItem) };
}

// Paginated orders. Admin sees all; customers pass their userId.
export async function list(
  opts: { userId?: string; page: number; limit: number },
): Promise<{
  orders: IOrder[];
  total: number;
  page: number;
  pages: number;
}> {
  const offset = (opts.page - 1) * opts.limit;

  // Distinct parameter sets: the admin (no userId) query must not reference
  // the user filter at all, or Postgres cannot infer parameter types.
  const listResult = opts.userId
    ? await db.pool.query<IOrderRow>(
        `SELECT * FROM orders WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [opts.userId, opts.limit, offset],
      )
    : await db.pool.query<IOrderRow>(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [opts.limit, offset],
      );
  const countResult = opts.userId
    ? await db.pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM orders WHERE user_id = $1',
        [opts.userId],
      )
    : await db.pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM orders',
      );

  const total = parseInt(countResult.rows[0].count, 10);
  return {
    orders: listResult.rows.map(rowToOrder),
    total,
    page: opts.page,
    pages: Math.max(1, Math.ceil(total / opts.limit)),
  };
}

// Create an order + items, decrement stock, clear the cart — all in one
// transaction. Prices are snapshotted from the product rows at placement
// time; stock rows are locked (FOR UPDATE) so concurrent orders can't
// oversell. Throws when a product no longer has enough stock.
export async function placeFromCart(
  userId: string,
  cart: { productId: string; quantity: number }[],
): Promise<IOrderWithItems> {
  return db.withTransaction(async (client) => {
    const items: IOrderItem[] = [];
    let total = 0;

    for (const line of cart) {
      // Lock the product row while we check + decrement its stock.
      const { rows } = await client.query<{
        id: string;
        name: string;
        price: string;
        stock: number;
      }>(
        'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE',
        [line.productId],
      );
      const product = rows[0];
      if (!product) {
        throw new Error(`Product ${line.productId} no longer exists`);
      }
      if (product.stock < line.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}" ` +
            `(requested ${line.quantity}, available ${product.stock})`,
        );
      }
      await client.query(
        'UPDATE products SET stock = stock - $2 WHERE id = $1',
        [product.id, line.quantity],
      );
      const unitPrice = parseFloat(product.price);
      total += unitPrice * line.quantity;
      items.push({
        id: '',
        orderId: '',
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: line.quantity,
      });
    }

    const { rows: orderRows } = await client.query<IOrderRow>(
      `INSERT INTO orders (user_id, status, total)
       VALUES ($1, 'pending', $2) RETURNING *`,
      [userId, total.toFixed(2)],
    );
    const order = rowToOrder(orderRows[0]);

    const itemRows: IOrderItemRow[] = [];
    for (const item of items) {
      const { rows } = await client.query<IOrderItemRow>(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [order.id, item.productId, item.productName, item.unitPrice, item.quantity],
      );
      itemRows.push(rows[0]);
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    return { ...order, items: itemRows.map(rowToItem) };
  });
}

// Move an order to a new status (validated by the caller).
export async function updateStatus(
  id: string,
  status: OrderStatus,
): Promise<IOrder | null> {
  const { rows } = await db.pool.query<IOrderRow>(
    'UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *',
    [id, status],
  );
  return rows[0] ? rowToOrder(rows[0]) : null;
}

// Restore stock for every item of an order (used by cancel).
export async function restoreStock(
  orderId: string,
  client?: PoolClient,
): Promise<void> {
  const executor = client ?? db.pool;
  await executor.query(
    `UPDATE products p
     SET stock = p.stock + oi.quantity
     FROM order_items oi
     WHERE oi.order_id = $1 AND p.id = oi.product_id`,
    [orderId],
  );
}

// Atomically cancel an order: locks the order row, re-checks it is still
// cancellable, restores stock. Returns the cancelled order, or null when
// the status changed concurrently.
export async function cancelAtomic(
  orderId: string,
): Promise<IOrder | null> {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query<IOrderRow>(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId],
    );
    if (!rows[0]) return null;
    const order = rowToOrder(rows[0]);
    if (
      order.status === OrderStatuses.CANCELLED ||
      (order.status !== OrderStatuses.PENDING &&
        order.status !== OrderStatuses.PAID)
    ) {
      return null;
    }
    await restoreStock(orderId, client);
    const { rows: updated } = await client.query<IOrderRow>(
      "UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *",
      [orderId],
    );
    return rowToOrder(updated[0]);
  });
}

export default {
  getByIdWithItems,
  list,
  placeFromCart,
  updateStatus,
  restoreStock,
  cancelAtomic,
} as const;
