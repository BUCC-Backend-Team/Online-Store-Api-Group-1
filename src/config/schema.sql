-- ============================================================
--psql -d online_store -f src/config/schema.sql
-- ============================================================

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'admin')),
  refresh_token TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------- PRODUCTS ----------
CREATE TABLE IF NOT EXISTS products (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200)      NOT NULL,
  sku        VARCHAR(100)      NOT NULL UNIQUE,
  price      NUMERIC(12, 2)    NOT NULL CHECK (price > 0),
  stock      INTEGER           NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ---------- CARTS (one line per cart item) ----------
CREATE TABLE IF NOT EXISTS carts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER     NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);

-- ---------- ORDERS ----------
CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER       NOT NULL
               REFERENCES users(id) ON DELETE CASCADE,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  status       VARCHAR(20)   NOT NULL DEFAULT 'Pending'
               CHECK (status IN ('Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled')),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------- ORDER ITEMS ----------
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER        NOT NULL
             REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER        NOT NULL
             REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INTEGER        NOT NULL CHECK (quantity > 0),
  price      NUMERIC(12, 2) NOT NULL CHECK (price > 0)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_sku            ON products(sku);
CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id          ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id  ON order_items(product_id);
