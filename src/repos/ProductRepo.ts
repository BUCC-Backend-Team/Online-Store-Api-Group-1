import db from '@src/config/db';
import { IProduct } from '@src/models/Product.model';

// A row from the products table.
interface IProductRow {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  created_at: string | Date;
  updated_at: string | Date;
}

// Convert a DB row to an IProduct (snake_case -> camelCase).
function rowToProduct(row: IProductRow): IProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    stock: row.stock,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Paginated product list, newest first.
export async function list(
  page: number,
  limit: number,
): Promise<{ products: IProduct[]; total: number; page: number; pages: number }> {
  const offset = (page - 1) * limit;
  const [listResult, countResult] = await Promise.all([
    db.pool.query<IProductRow>(
      'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    ),
    db.pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM products'),
  ]);
  const total = parseInt(countResult.rows[0].count, 10);
  return {
    products: listResult.rows.map(rowToProduct),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

// Get one product by id.
export async function getById(id: string): Promise<IProduct | null> {
  const { rows } = await db.pool.query<IProductRow>(
    'SELECT * FROM products WHERE id = $1',
    [id],
  );
  return rows[0] ? rowToProduct(rows[0]) : null;
}

// Create a product.
export async function create(
  name: string,
  description: string | null,
  price: number,
  stock: number,
): Promise<IProduct> {
  const { rows } = await db.pool.query<IProductRow>(
    `INSERT INTO products (name, description, price, stock)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description, price, stock],
  );
  return rowToProduct(rows[0]);
}

// Update a product (partial), returns null when the id does not exist.
export async function update(
  id: string,
  fields: { name?: string; description?: string | null; price?: number; stock?: number },
): Promise<IProduct | null> {
  const { rows } = await db.pool.query<IProductRow>(
    `UPDATE products SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       price = COALESCE($4, price),
       stock = COALESCE($5, stock),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      fields.name ?? null,
      fields.description ?? null,
      fields.price ?? null,
      fields.stock ?? null,
    ],
  );
  return rows[0] ? rowToProduct(rows[0]) : null;
}

// Delete a product, returns whether a row was removed.
export async function remove(id: string): Promise<boolean> {
  const { rowCount } = await db.pool.query(
    'DELETE FROM products WHERE id = $1',
    [id],
  );
  return rowCount === 1;
}

export default { list, getById, create, update, remove } as const;
