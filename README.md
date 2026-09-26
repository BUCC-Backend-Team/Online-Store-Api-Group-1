<div align="center">

# Online Store API

**REST API for an e-commerce backend**

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io)

**[Live API](#live-api) · [Quick Start](#quick-start) · [API Reference](#api-reference)**

</div>

---

## Features

- JWT authentication with access and refresh tokens
- User profiles and admin user management
- Product catalog with pagination and Redis caching
- Persistent shopping cart with stock validation
- Order creation, cancellation, and stock management
- Redis-backed rate limiting
- CORS and request validation
- Structured JSON logging
- Health check endpoint

---

## Tech Stack

| Technology  | Purpose                   |
| ----------- | ------------------------- |
| Node.js 22+ | Runtime                   |
| TypeScript  | Language                  |
| Express 5   | API framework             |
| PostgreSQL  | Primary database          |
| Redis       | Caching and rate limiting |
| JWT         | Authentication            |
| Zod         | Validation                |
| Vitest      | Testing                   |

---

## Quick Start

### Requirements

- Node.js 22+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
git clone <repository-url>
cd Online-Store-Api-Group-1
npm install
```

### Environment

```bash
cp .env.example config/.env.development
```

Configure PostgreSQL, Redis, JWT, admin, and CORS variables in:

```text
config/.env.development
```

### Run

```bash
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

Verify the API:

```bash
curl http://localhost:3000/api/health
```

---

## Live API
| Resource     | URL                                       |
| ------------ | ----------------------------------------- |
| **Base URL** | `https://your-deployment.example.com/api` |
| **Health**   | `GET /api/health`                         |
| **API Docs** | `https://your-docs.example.com`           |

## API Reference

### Health

| Method | Endpoint      | Auth | Description       |
| ------ | ------------- | ---- | ----------------- |
| GET    | `/api/health` | —    | API health status |

### Authentication
| Method | Endpoint            | Auth   | Description          |
| ------ | ------------------- | ------ | -------------------- |
| POST   | `/api/auth/signup`  | —      | Register a user      |
| POST   | `/api/auth/login`   | —      | Login                |
| POST   | `/api/auth/refresh` | Cookie | Refresh access token |
| POST   | `/api/auth/logout`  | Cookie | Logout               |

### Users
| Method | Endpoint         | Auth  | Description        |
| ------ | ---------------- | ----- | ------------------ |
| GET    | `/api/users/me`  | User  | Get own profile    |
| PATCH  | `/api/users/me`  | User  | Update own profile |
| GET    | `/api/users`     | Admin | List users         |
| GET    | `/api/users/:id` | Admin | Get user           |
| DELETE | `/api/users/:id` | Admin | Delete user        |

### Products
| Method | Endpoint                  | Auth  | Description    |
| ------ | ------------------------- | ----- | -------------- |
| GET    | `/api/product?page&limit` | —     | List products  |
| GET    | `/api/product/:id`        | —     | Get product    |
| POST   | `/api/product`            | Admin | Create product |
| PATCH  | `/api/product/:id`        | Admin | Update product |
| DELETE | `/api/product/:id`        | Admin | Delete product |

### Cart
| Method | Endpoint            | Auth | Description     |
| ------ | ------------------- | ---- | --------------- |
| GET    | `/api/cart`         | User | Get cart        |
| POST   | `/api/cart`         | User | Add item        |
| PATCH  | `/api/cart/:itemId` | User | Update quantity |
| DELETE | `/api/cart/:itemId` | User | Remove item     |
| DELETE | `/api/cart`         | User | Clear cart      |

### Orders
| Method | Endpoint                    | Auth       | Description         |
| ------ | --------------------------- | ---------- | ------------------- |
| POST   | `/api/orders`               | User       | Place order         |
| GET    | `/api/orders?page&limit`    | User/Admin | List orders         |
| GET    | `/api/orders/:id`           | User/Admin | Get order           |
| POST   | `/api/orders/:id/completed` | User       | Complete payment    |
| POST   | `/api/orders/:id/cancel`    | User/Admin | Cancel order        |
| PATCH  | `/api/orders/:id/status`    | Admin      | Update order status |

---

## Testing

Run the test suite:

```bash
npm test
```

Other commands:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```