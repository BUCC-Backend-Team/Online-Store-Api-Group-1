import { PoolClient } from 'pg';

import db from '@src/config/db';
import { ICartItem } from '@src/models/Cart.model';

// A cart_items row joined with product name/price/stock.
interface ICartItemRow {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: string;
  stock: number;
  created_at: string | Date;
  updated_at: string | Date;
}

const JOIN_QUERY = `
  SELECT ci.id, ci.product_id, p.name AS product_name, ci.quantity,
         p.price, p.stock, ci.created_at, ci.updated_at
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id`;

function rowToItem(row: ICartItemRow): ICartItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    price: row.price,
    stock: row.stock,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Get a user's cart with live product data.
export async function getCart(userId: string): Promise<ICartItem[]> {
  const { rows } = await db.pool.query<ICartItemRow>(
    `${JOIN_QUERY} WHERE ci.user_id = $1 ORDER BY ci.created_at ASC`,
    [userId],
  );
  return rows.map(rowToItem);
}

// Get one cart item (used for ownership checks).
export async function getItem(
  itemId: string,
): Promise<(ICartItem & { userId: string }) | null> {
  const { rows } = await db.pool.query<
    ICartItemRow & { user_id: string }
  >(`${JOIN_QUERY} WHERE ci.id = $1`, [itemId]);
  if (!rows[0]) return null;
  return { ...rowToItem(rows[0]), userId: rows[0].user_id };
}

// Add a product to the cart; merges quantity if it's already there.
export async function addItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<ICartItem> {
  const { rows } = await db.pool.query<{ id: string }>(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity,
                   updated_at = now()
     RETURNING id`,
    [userId, productId, quantity],
  );
  if (!rows[0]) {
    throw new Error('cart item insert failed');
  }
  // Re-read through the product join for live name/price/stock.
  const item = await getItem(rows[0].id);
  if (!item) {
    throw new Error('cart item insert failed');
  }
  return item;
}

// Update an item's quantity.
export async function updateQuantity(
  itemId: string,
  quantity: number,
): Promise<void> {
  await db.pool.query(
    'UPDATE cart_items SET quantity = $2, updated_at = now() WHERE id = $1',
    [itemId, quantity],
  );
}

// Remove one item.
export async function removeItem(itemId: string): Promise<boolean> {
  const { rowCount } = await db.pool.query(
    'DELETE FROM cart_items WHERE id = $1',
    [itemId],
  );
  return rowCount === 1;
}

// Empty the user's cart. Accepts a client to run inside a transaction.
export async function clearCart(
  userId: string,
  client?: PoolClient,
): Promise<void> {
  const executor = client ?? db.pool;
  await executor.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}

export default {
  getCart,
  getItem,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
} as const;
