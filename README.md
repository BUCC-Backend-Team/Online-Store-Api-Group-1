<div align="center">

# Online Store API

### REST API for modern e-commerce applications.

Built with **Node.js · Express · TypeScript · PostgreSQL · Redis**

<p>
  <a href="#-overview">Overview</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="https://john-ayodeji.docs.buildwithfern.com/">API Reference</a> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#deployment-production">Deployment</a> ·
  <a href="#-testing">Testing</a>
</p>

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express.js-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Lockout-DC382D?logo=redis&logoColor=white)](https://redis.io/)

</div>

---

##  Overview

**Online Store API** is a RESTful e-commerce API designed to provide the core services required by an online shopping platform.

The API handles the complete customer journey from authentication and product discovery to cart management and checkout while providing security controls and architecture that can scale as the application grows.

### Core capabilities

-  Secure user authentication with JWT access and refresh tokens
-  Account protection and brute-force prevention
-  Product management and administration
-  Persistent shopping cart functionality
-  Order creation and order history
-  HTTP security headers and password hashing
-  Redis-backed account lockout protection
-  Modular controller-based architecture
- ️ PostgreSQL-backed relational data model

---

## Features

| Feature | Description |
| --- | --- |
| **Authentication** | JWT-based authentication with access and refresh tokens |
| **Account Security** | Brute-force protection and account lockout mechanisms |
| **Product Management** | Retrieve and create products with admin authorization |
| **Shopping Cart** | Persistent PostgreSQL-backed cart: add, update, remove, and clear items |
| **Checkout** | Convert a user's cart into an order || **Order History** | Retrieve previous orders and individual order details |
| **Password Security** | Password hashing using Bcrypt |
| **HTTP Security** | Secure HTTP headers using Helmet |
| **Request Logging** | Structured logging for application and request tracing |
| **Caching / Lockout** | Redis integration for security-related state |
| **Rate Limiting** | Redis-backed fixed-window limits per IP with standard rate limit headers |
| **Type Safety** | End-to-end TypeScript development |

---

##  Tech Stack

### Backend

| Technology | Purpose |
| --- | --- |
| **Node.js** | JavaScript runtime |
| **Express.js** | REST API framework |
| **TypeScript** | Type-safe application development |
| **PostgreSQL** | Primary relational database |
| **Redis** | Account lockout and temporary state |
| **JWT** | Authentication and token management |
| **Bcrypt** | Password hashing |
| **Helmet** | HTTP security headers |

### Development & Testing

| Tool | Purpose |
| --- | --- |
| **tsx** | TypeScript execution |
| **nodemon** | Development server reloading |
| **ioredis-mock** | Redis mocking during development/testing |
| **TypeScript** | Static type checking |

---

##  Architecture

The API follows a modular, controller-based architecture that separates HTTP concerns, business logic, data access, and cross-cutting concerns.

### Request Flow

```text
Client
  │
  ▼
Routes
  │
  ▼
Middleware
  │
  ├── Authentication
  ├── Authorization
  ├── Security
  └── Logging
  │
  ▼
Controllers
  │
  ▼
Models / Data Access
  │
  ▼
PostgreSQL

        ┌───────────┐
        │   Redis   │
        │ Lockout / │
        │   State   │
        └───────────┘
```

### Architecture Responsibilities

| Layer | Responsibility |
| --- | --- |
| **Routes** | Define API endpoints and map requests to controllers |
| **Middleware** | Authentication, authorization, security, and logging |
| **Controllers** | Process requests and coordinate application logic |
| **Models** | Interact with the PostgreSQL data layer |
| **Config** | Centralized application and database configuration |
| **Database** | Persistent storage for users, products, carts, and orders |
| **Redis** | Temporary state and account lockout protection |

---

## System Diagrams

The following diagrams describe the system from three different perspectives: **overall architecture, data relationships, and order processing**.

### 1. REST API Architecture

The high-level system architecture showing how clients interact with the REST API and how the API communicates with its underlying services.

![Online Store REST API Architecture](assets/Online%20Store%20REST%20API%20Architecture.png)

---

### 2. Entity Relationship Diagram

The ERD illustrates the database structure, entities, attributes, and relationships that support the store's core functionality.

![Online Store API ERD](assets/ERD%20API.png)

---

### 3. Order Processing Architecture

The order-processing architecture illustrates how a customer's cart moves through checkout and becomes a completed order.

![Order Processing Architecture](assets/Online%20Store%20Order%20Processing%20Architecture.png)

---

## 🔌 API Reference

> For the complete interactive API documentation, see the **[Postman Documentation](https://documenter.getpostman.com/view/YOUR_POSTMAN_LINK)**.

### Authentication

| Method | Endpoint | Description |  Auth  |
| :---: | --- | --- |:------:|
| `POST` | `/api/auth/register` | Create an account (auto-login, returns tokens) |  None  |
| `POST` | `/api/auth/login` | Authenticate a user |  None  |
| `POST` | `/api/auth/refresh` | Rotate access tokens using the refresh token | Cookie |
| `POST` | `/api/auth/logout` | Invalidate the refresh token and clear auth cookies | Cookie |
| `GET` | `/api/auth/me` | Get the current authenticated user's profile | Bearer Token |

### Products

| Method | Endpoint | Description |   Auth   |
| :---: | --- | --- |:--------:|
| `GET` | `/api/products` | Retrieve all products |   None   |
| `POST` | `/api/products` | Create a new product |  Admin |

### Cart

| Method | Endpoint | Description |     Auth     |
| :---: | --- | --- |:------------:|
| `GET` | `/api/cart` | View the current user's cart | Bearer Token |
| `POST` | `/api/cart` | Add an item (`productId`, `quantity`) to the cart | Bearer Token |
| `PUT` | `/api/cart/:productId` | Update an item's quantity | Bearer Token |
| `DELETE` | `/api/cart/:productId` | Remove an item from the cart | Bearer Token |
| `DELETE` | `/api/cart` | Clear the cart | Bearer Token |

### Orders

| Method | Endpoint | Description |     Auth     |
| :---: | --- | --- |:------------:|
| `POST` | `/api/orders/checkout` | Create an order from the current cart (no body needed) | Bearer Token |
| `GET` | `/api/orders` | Retrieve the user's order history | Bearer Token |
| `GET` | `/api/orders/:id` | Retrieve a specific order | Bearer Token |
| `PATCH` | `/api/orders/:id/status` | Admin: update order status (`Pending`, `Paid`, `Shipped`, `Delivered`, `Cancelled`) | Admin |

---

## Authentication Flow

The API uses a short-lived **access token** together with a **refresh token** to provide secure authenticated sessions.

```text
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ Login credentials
     ▼
┌──────────────┐
│ POST /login  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Validate User    │
│ + Verify Bcrypt  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ Generate Access Token   │
│ Generate Refresh Token │
└──────────┬──────────────┘
           │
           ▼
      Client receives
      access token +
      refresh cookie
```

When the access token expires, the client can use:

```http
POST /api/auth/refresh
```

to obtain a new access token through the refresh-token flow.

---

##  Order Flow

The checkout process follows a simple cart-to-order workflow:

```text
User
 │
 ▼
Shopping Cart (PostgreSQL)
 │
 │ POST /api/orders/checkout
 ▼
Lock cart rows + price items server-side from the products table
 │
 ▼
Validate stock (atomic guard per item)
 │
 ▼
Create order + order items
 │
 ▼
Decrement stock, clear cart
 │
 ▼
COMMIT (or ROLLBACK on any failure — cart is preserved)
```

This keeps checkout fully transactional: prices are taken from the database
(never trusted from the client), stock is guarded atomically, and a failed
checkout leaves the cart intact.

---

## Project Structure

```text
Online-Store-API/
│
├── assets/
│   ├── ERD API.png
│   ├── Online Store REST API Architecture.png
│   └── Online Store Order Processing Architecture.png
│
├── src/
│   ├── config/
│   │   ├── env.ts       # Centralized, fail-fast environment config
│   │   ├── db.ts        # Postgres pool + startup connectivity check
│   │   ├── redis.ts     # Redis client (real ioredis in prod, mock in dev)
│   │   ├── schema.sql   # Database schema (tables, constraints, indexes)
│   │   └── migrate.ts   # Node-based migration script (npm run db:migrate)
│   │
│   ├── controllers/
│   │   └── # HTTP request handlers
│   │
│   ├── middleware/
│   │   └── # Authentication, logging & security
│   │
│   ├── models/
│   │   └── # Database models & queries
│   │
│   ├── routes/
│   │   └── # API route definitions
│   │
│   ├── app.ts
│   │   # Express app: middleware, routes, 404 + error handling
│   └── index.ts
│       # Entry point: startup DB check, listen, graceful shutdown
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

##  Quick Start

### Prerequisites

Make sure the following are installed:

- **Node.js** `18+`
- **npm**
- **PostgreSQL**
- **Redis** *(optional for development when using the Redis mock)*

### 1. Clone the repository

```bash
git clone https://github.com/BUCC-Backend-Team/Online-Store-API.git

cd Online-Store-API
```

### 2. Install dependencies

```bash
npm install
```
### 3. Configure environment variables

Create your local environment file:

```bash
cp .env.example .env
```

Then configure the required values (including `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the seed script):

```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=online_store

# JWT secrets
JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

# Seed admin (used by `npm run seed`)
ADMIN_EMAIL=admin@store.com
ADMIN_PASSWORD=change_this_admin_password

# Optional
# CORS_ORIGIN=http://localhost:5173   # comma-separated frontend origin allowlist
# TRUST_PROXY=false                   # true only behind a reverse proxy
# LOCKOUT_MAX_ATTEMPTS=5              # failed logins before lockout
# LOCKOUT_WINDOW_SECONDS=900          # lockout duration (15 min)
```

> Use strong, unique secrets in production. Never commit your `.env` file or expose JWT secrets publicly.

> **Startup check:** the server verifies the database connection *before* accepting traffic. If your `DB_*` credentials are wrong, it exits immediately with a clear error instead of booting into failing requests — fix `.env` and start again.

### 4. Initialize the database schema

Apply the schema (tables, constraints, indexes) to your database:

```bash
npm run db:migrate
```

This runs a Node script (`src/config/migrate.ts`) — no `psql` CLI required. It creates the database if it doesn't exist (when your user has permission) and applies `schema.sql` idempotently, so it's safe to re-run.

### 5. Seed the admin user

Create the admin account from your `ADMIN_EMAIL` / `ADMIN_PASSWORD` env values (idempotent, safe to re-run):

```bash
npm run seed
```

### 6. Start the development server

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3000
```

> **No Redis needed in development** — the app automatically uses `ioredis-mock` (in-memory) unless `NODE_ENV=production`. Redis is only required in production.

### 7. Build for production

```bash
npm run build   # emits to dist/
npm start       # runs node dist/index.js
```

---

## Deployment (Production)

### Required environment variables

In production (`NODE_ENV=production`) the server **refuses to start** unless critical variables are set — fail-fast validation lives in `src/config/env.ts`:

| Variable | Required | Description                                                       |
| --- | :---: |-------------------------------------------------------------------|
| `NODE_ENV` | ✅ | Set to `production` (enables secure cookies + strict validation)  |
| `DATABASE_URL` | ✅* | Postgres connection string  alternative to the `DB_*` variables   |
| `JWT_ACCESS_SECRET` | ✅ | Long random string, e.g. `openssl rand -hex 32`                   |
| `JWT_REFRESH_SECRET` | ✅ | Long random string, **different** from the access secret          |
| `REDIS_URL` | ✅ | Real Redis connection  the in-memory mock is dev-only             |
| `TRUST_PROXY` | recommended | `true` when behind a reverse proxy (nginx, Render, Railway, Fly.io) |
| `CORS_ORIGIN` | recommended | Comma-separated allowlist of frontend origins                     |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first deploy | Used once by `npm run seed`                                       |

* Or the `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` set.

```env
NODE_ENV=production
TRUST_PROXY=true
DATABASE_URL=<internal postgres URL>
REDIS_URL=<internal redis URL>
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
ADMIN_EMAIL=admin@store.com
ADMIN_PASSWORD=<strong password>
CORS_ORIGIN=https://your-frontend.example
```

5. Run migrations **once**:

```bash
npx tsx src/config/migrate.ts
npx tsx src/config/seed.ts
````
---

## Testing

Redis-dependent security logic can be tested without a live Redis instance using `ioredis-mock`.

For integration tests, ensure the required PostgreSQL configuration is available in your environment.

> A test suite is not yet included in the repository. Contributions welcome!

---

## Examples

### Register

**Request**

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Response (201)**

```json
{
  "success": true,
  "message": "Registration successful",
  "user": { "id": 1, "name": "Jane Doe", "email": "jane@example.com", "role": "customer" },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Duplicate emails return **409 Conflict**.

### Login

**Request**

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Response (200)**

```json
{
  "success": true,
  "message": "Login successful",
  "user": { "id": 1, "name": "Jane Doe", "email": "jane@example.com", "role": "customer" },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Current user

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

The refresh token is handled through the configured refresh-token cookie.

---

## Security

The application includes:

- **JWT authentication** for protected resources
- **Refresh-token rotation** for session renewal
- **Bcrypt password hashing**
- **Helmet** for secure HTTP headers
- **Account lockout** for repeated failed authentication attempts
- **Rate limiting** — strict limits on auth endpoints (10 req / 15 min per IP), general limits on all other API routes (100 req / 15 min per IP), with standard `RateLimit-*` and `Retry-After` headers
- **Product caching** — cache-aside Redis cache on product list reads (60s TTL), invalidated on product creation (`X-Cache: HIT/MISS` response header)
- **Redis-backed temporary security state** (lockout counters + rate-limit windows)
- **Role-based access** for administrative product operations
- **Environment-based secret management**
- **Structured request logging**
- **CORS support** — optional origin allowlist via `CORS_ORIGIN` (comma-separated), credentials enabled

> **Note on Redis:** development automatically uses `ioredis-mock` (in-memory, per-process) — rate-limit and lockout counters reset on server restart. In production (`NODE_ENV=production`) the app connects to a **real Redis** using `REDIS_URL`; the server refuses to start without it.

---

##  API Documentation

Interactive API documentation is available through Postman:

**[View API Documentation](https://john-ayodeji.docs.buildwithfern.com/)**

The Postman collection provides request examples, parameters, authentication requirements, and response structures.

---

##  API at a Glance

```text
                    ONLINE STORE API
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      AUTHENTICATION    PRODUCTS          CART
          │                │                │
          │                │                │
          ▼                ▼                ▼
       Login           List Products      View Cart
       Refresh         Create Product     Add Item
                                          Remove Item
                                               │
                                               ▼
                                            ORDERS
                                               │
                                      ┌────────┴────────┐
                                      ▼                 ▼
                                   Checkout         Order History
                                      │
                                      ▼
                                Order Details
```

---

## Design Goals

The project is designed around a few core engineering principles:

### Separation of Concerns

Each application layer has a clear responsibility, making the codebase easier to understand and maintain.

### Security by Default

Authentication, password protection, account lockout, and HTTP security are treated as first-class concerns.

### Scalability

The modular architecture makes it possible to extend the API with additional services and functionality without coupling the entire application together.

### Maintainability

TypeScript, structured modules, centralized configuration, and clear API boundaries make the project easier for developers to work on collaboratively.

---

<div align="center">

### Online Store API

**Built with Node.js · Express · TypeScript · PostgreSQL · Redis**

</div>