<div align="center">

# 🛒 Online Store API

**REST API** for an e-commerce backend

[![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-cache%20%2B%20rate%20limit-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Tests](https://img.shields.io/badge/tests-85%2B%20passing-brightgreen)](#testing)

[Live API](#-live-api) · [Postman](#-test-in-postman) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Docs](#-docs)

</div>

---

##  Features

-  **Authentication** - JWT access tokens (15 min) + rotating refresh tokens in httpOnly cookies, refresh tokens tracked in Redis for instant revocation, admin seeded from env (no admin signup)
-  **Users** - public profile management, admin-only user administration
-  **Products** - public catalog with pagination, admin CRUD, **Redis cache-aside with instant invalidation on every write**
-  **Cart** - live catalog prices, per-user persistence in Postgres, stock-aware quantity validation
-  **Orders** - one-transaction placement (row-level locking prevents overselling), price snapshots at placement, cancel restores stock atomically
-  **Rate limiting** - Redis-backed per-IP limits (stricter on auth), degrades gracefully if Redis is down
-  **CORS** - credentials-aware allowlist
-  **Structured JSON logs** - every request + security event, parseable by any aggregator
- ️ **Health endpoint** - service-level status for monitoring

##  Requirements

| Dependency | Version |
|---|---|
| Node.js | ≥ 22.12 |
| PostgreSQL | any 14+ (works with Supabase, Neon, RDS, local…) |
| Redis | any 6+ (Redis Cloud, Upstash, local…) |

##  Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example config/.env.development   # then edit the values

# 3. Start in dev (auto-creates tables + admin on boot)
npm run dev

# 4. Verify
curl http://localhost:3000/api/health
```

Open Postman → [Import the collection](#-test-in-postman) → start hitting endpoints.

## ️ Setup

### 1. Environment variables

Everything is configured in `config/.env.development` (see `.env.example` for every key). Highlights:

| Variable | Description                                                            |
|---|------------------------------------------------------------------------|
| `PORT` | HTTP port (default `3000`)                                             |
| `DB_*` | Postgres host/port/user/password/name + `DB_SSL`                       |
| `REDIS_*` | Redis host/port/username/password/db                                   |
| `JWT_ACCESS_SECRET` | Secret for access tokens - **generate with `openssl rand -hex 32`**    |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens - use a different value                      |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (default `15m`)                                  |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | Refresh cookie lifetime (default `7`)                                  |
| `ADMIN_NAME/EMAIL/PASSWORD` | Seeded admin account (created at startup)                              |
| `RATE_LIMIT_*` | Window + per-window max for general and auth limiters                  |
| `CORS_ORIGINS` | Comma-separated allowlist - **empty = reflect any origin (dev only!)** |

### 2. Database schema

No manual migration step: on boot the app runs `src/config/schema.sql` (idempotent `CREATE TABLE IF NOT EXISTS`) against the configured database - `users`, `products`, `cart_items`, `orders`, `order_items` — and upserts the env admin.

### 3. Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Vitest suite (DB/Redis mocked — no live services needed) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` / `npm start` | Production build / run |

## 🔗 Live API

| | |
|---|---|
| **Base URL** | `https://your-deployment.example.com/api` |
| **Health** | [`GET /api/health`](https://your-deployment.example.com/api/health) |
| **Docs** | https://your-docs.example.com |


##  Test in Postman

<div align="center">

**[⬇ Download the Postman collection](docs/Online-Store-API.postman_collection.json)**

</div>

1. In Postman: **Import** → drag the file (or Import From → File)
2. Open the collection → **Variables** tab → set `baseUrl`, `adminPassword` (from your `.env`)
3. Run **Auth → Signup** or **Auth → Login** — tests in the collection auto-save the access token, so every later request is already authorized
4. The suggested order: `Health → Auth → Products → Cart → Orders`

The collection includes **test scripts** that assert status codes and auto-capture tokens, plus descriptive docs on every request.

##  API Reference

**Auth:** `Authorization: Bearer <accessToken>` header (except auth + public routes). The refresh token travels in an httpOnly cookie.

### Health
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Service probe: `200 ok` / `503` DB down |

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register (`name`, `email`, `password`, `passwordConfirm`) |
| POST | `/api/auth/login` | — | Email + password → access token + refresh cookie |
| POST | `/api/auth/refresh` | cookie | Rotate refresh token → new access token |
| POST | `/api/auth/logout` | cookie | Revoke refresh token, clear cookie |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | user | My profile |
| PATCH | `/api/users/me` | user | Update name/email |
| GET | `/api/users` | admin | All users |
| GET | `/api/users/:id` | admin | One user |
| DELETE | `/api/users/:id` | admin | Delete user (+ revoke their sessions) |

### Products *(Redis-cached)*
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/product?page&limit` | — | Paginated list (`limit` ≤ 100) |
| GET | `/api/product/:id` | — | Product detail |
| POST | `/api/product` | admin | Create (name, description, price, stock) |
| PATCH | `/api/product/:id` | admin | Partial update |
| DELETE | `/api/product/:id` | admin | Delete |

### Cart
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/cart` | user | My cart (live prices) |
| POST | `/api/cart` | user | Add item (merges duplicates, stock-checked) |
| PATCH | `/api/cart/:itemId` | user | Change quantity |
| DELETE | `/api/cart/:itemId` | user | Remove item |
| DELETE | `/api/cart` | user | Clear cart |

### Orders
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | user | Place from cart — snapshots prices, reserves stock |
| GET | `/api/orders?page&limit` | user/admin | Own orders / all orders (admin) |
| GET | `/api/orders/:id` | user/admin | One order (owner or admin) |
| POST | `/api/orders/:id/completed` | user | Demo payment: `pending → paid` |
| POST | `/api/orders/:id/cancel` | user/admin | Cancel + restore stock |
| PATCH | `/api/orders/:id/status` | admin | Force `pending → paid` |

**Order lifecycle:**
```
            POST /orders                POST /orders/:id/completed   PATCH /orders/:id/status (admin)
   cart ────────────────▶ PENDING ──────────────────────────▶ PAID ─────────────┐
                            │                                                     │
                            │        POST /orders/:id/cancel (owner or admin)     │
                            └────────────────────────────────────────────────────▶ CANCELLED
```
Prices are **never fixed in the cart** — only when an order is placed are `unit_price` and `total` snapshotted onto the order, so catalog price changes can't rewrite history. Cancelling (from `pending` or `paid`) restores stock atomically.

##  Sample Requests & Responses

<details>
<summary><b>Signup → 201</b></summary>

```http
POST /api/auth/signup
Content-Type: application/json

{ "name": "Jane Doe", "email": "jane@example.com", "password": "Password123", "passwordConfirm": "Password123" }
```
```json
{
  "status": "success",
  "user": { "id": "731cce08-…", "name": "Jane Doe", "email": "jane@example.com", "role": "user", "createdAt": "2026-09-26T11:43:41.429Z" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…"
}
```
+ `Set-Cookie: refresh_token=…; HttpOnly; Path=/api/auth; SameSite=Strict`
</details>

<details>
<summary><b>Validation error → 400</b></summary>

```http
POST /api/auth/signup
{ "name": "X", "email": "bad", "password": "short", "passwordConfirm": "nope" }
```
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Please provide a valid email address" },
    { "field": "password", "message": "Password must be at least 8 characters" },
    { "field": "password", "message": "Password must contain an uppercase letter" },
    { "field": "password", "message": "Password must contain a digit" },
    { "field": "passwordConfirm", "message": "Passwords do not match" }
  ]
}
```
</details>

<details>
<summary><b>Place order → 201</b></summary>

```http
POST /api/orders
Authorization: Bearer <accessToken>
```
```json
{
  "status": "success",
  "order": {
    "id": "66666666-…",
    "status": "pending",
    "total": "180.00",
    "items": [ { "productId": "926119e2-…", "productName": "Demo Gadget", "unitPrice": "60.00", "quantity": 3 } ]
  }
}
```
</details>

<details>
<summary><b>Rate limited → 429</b></summary>

```json
{ "error": "Too many requests, please try again later" }
```
</details>

##  Architecture

```
src/
├── common/            # env, HttpStatusCodes, JSON logger, errors, jwt
├── config/            # db.ts (pg Pool), redis.ts, schema.sql
├── controllers/       # request/response layer per entity
├── middleware/        # auth (JWT/admin), validation, rate limit, CORS, logging
├── models/            # types + zod schemas
├── repos/             # SQL + Redis data access
├── routes/            # endpoint wiring
├── main.ts            # startup: DB → Redis → migrations → admin → listen
└── server.ts          # express app + error handling
```

- **MVC-ish layering** — routes → controllers → repos → (pg / redis); models hold types & zod schemas
- **Graceful degradation** — Redis down ⇒ cache misses + disabled rate limiting, but the API stays up; Postgres down ⇒ health reports `error` and startup fails fast
- **Startup sequence** — connect DB → connect Redis (non-fatal) → apply `schema.sql` → seed admin → listen

##  Testing

```bash
npm test
```
85+ tests across 8 suites (auth, users, products, cart, orders, health, cors, rate-limiting). DB and Redis are **mocked**, so no live services are required; JWT, bcrypt, validation, and status-transition logic run for real.

