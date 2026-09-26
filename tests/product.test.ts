import request from 'supertest';
import bcrypt from 'bcryptjs';

import app from '@src/server';
import * as UserRepo from '@src/repos/UserRepo';
import type * as ProductRepoModule from '@src/repos/ProductRepo';
import type { IProduct } from '@src/models/Product.model';
import type { IUser } from '@src/models/User.model';

// Mock the DB/Redis layers; auth + validation run for real.
vi.mock('@src/repos/UserRepo', (): typeof import('@src/repos/UserRepo') => {
  const mock = {
    getById: vi.fn(),
    getByEmail: vi.fn(),
    getAll: vi.fn(),
    create: vi.fn(),
    updateProfile: vi.fn(),
    remove: vi.fn(),
    countAdmins: vi.fn(),
  };
  return { ...mock, default: mock };
});

vi.mock('@src/repos/tokenRepo', (): typeof import('@src/repos/tokenRepo') => {
  const mock = {
    newJti: vi.fn(() => 'test-jti'),
    store: vi.fn(),
    exists: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
  };
  return { default: mock, ...mock };
});

vi.mock('@src/repos/ProductRepo', (): typeof ProductRepoModule => {
  const mock = {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  return { ...mock, default: mock };
});

vi.mock('@src/repos/productCache', (): Record<string, unknown> => {
  const mock = {
    list: vi.fn(),
    getById: vi.fn(),
    invalidateAll: vi.fn(),
  };
  return { default: mock, ...mock };
});

vi.mock('@src/config/db', () => ({
  default: { pool: { query: vi.fn() }, connectDb: vi.fn(), closeDb: vi.fn() },
}));

vi.mock('@src/config/redis', () => ({
  default: {
    client: { on: vi.fn() },
    ensureConnected: vi.fn(),
    connectRedis: vi.fn(),
    closeRedis: vi.fn(),
  },
}));

import * as ProductRepo from '@src/repos/ProductRepo';
import productCache from '@src/repos/productCache';
import tokenRepo from '@src/repos/tokenRepo';

// ---- Mock handles ----

const getByEmailMock = vi.mocked(UserRepo.getByEmail);
const productRepoMock = {
  list: vi.mocked(ProductRepo.list),
  getById: vi.mocked(ProductRepo.getById),
  create: vi.mocked(ProductRepo.create),
  update: vi.mocked(ProductRepo.update),
  remove: vi.mocked(ProductRepo.remove),
};
const cacheMock = {
  list: vi.mocked(productCache.list),
  getById: vi.mocked(productCache.getById),
  invalidateAll: vi.mocked(productCache.invalidateAll),
};
const tokenStoreMock = vi.mocked(tokenRepo.store);

// Typed accessors for supertest response bodies (their `.body` is `any`).
function body<T>(res: { body: unknown }): T {
  return res.body as T;
}
type Issue = { field: string; message: string };
function issues(res: { body: unknown }): Issue[] {
  return (res.body as { details?: Issue[] }).details ?? [];
}

// ---- Fixtures ----

const adminId = '11111111-1111-4111-8111-111111111111';
const productId = '33333333-3333-4333-8333-333333333333';

function makeProduct(over: Partial<IProduct> = {}): IProduct {
  return {
    id: productId,
    name: 'Widget',
    description: 'A useful widget',
    price: '9.99',
    stock: 42,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
  };
}

function makeAdmin(): IUser {
  return {
    id: adminId,
    name: 'Admin',
    email: 'admin@test.local',
    passwordHash: bcrypt.hashSync('admin_password_123', 10),
    role: 'admin',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
}

async function loginAsAdmin() {
  getByEmailMock.mockResolvedValue(makeAdmin());
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@test.local',
    password: 'admin_password_123',
  });
  return body<{ accessToken: string }>(res).accessToken;
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenStoreMock.mockResolvedValue(undefined);
  cacheMock.invalidateAll.mockResolvedValue(undefined);
});

// ---- Public reads ----

describe('GET /api/product (public)', () => {
  it('should return a paginated list without auth.', async () => {
    cacheMock.list.mockResolvedValue({
      products: [makeProduct()],
      total: 1,
      page: 2,
      pages: 5,
    });

    const res = await request(app).get('/api/product?page=2&limit=10');

    expect(res.status).toBe(200);
    expect(body<{ status: string }>(res).status).toBe('success');
    expect(body<{ products: unknown[] }>(res).products).toHaveLength(1);
    expect(body<{ total: number }>(res).total).toBe(1);
    expect(body<{ page: number }>(res).page).toBe(2);
    expect(body<{ pages: number }>(res).pages).toBe(5);
    expect(cacheMock.list).toHaveBeenCalledWith(2, 10);
  });

  it('should default to page 1 and limit 20.', async () => {
    cacheMock.list.mockResolvedValue({
      products: [],
      total: 0,
      page: 1,
      pages: 1,
    });

    const res = await request(app).get('/api/product');

    expect(res.status).toBe(200);
    expect(cacheMock.list).toHaveBeenCalledWith(1, 20);
  });

  it('should 400 for invalid pagination params.', async () => {
    const res = await request(app).get('/api/product?page=0&limit=abc');

    expect(res.status).toBe(400);
    expect(body<{ error: string }>(res).error).toBe('Validation failed');
    const fields = issues(res).map((i) => i.field);
    expect(fields).toContain('page');
    expect(fields).toContain('limit');
  });

  it('should 400 when limit exceeds the cap.', async () => {
    const res = await request(app).get('/api/product?limit=1000');

    expect(res.status).toBe(400);
    expect(issues(res)[0].message).toMatch(/at most 100/i);
  });
});

describe('GET /api/product/:id (public)', () => {
  it('should return one product without auth.', async () => {
    cacheMock.getById.mockResolvedValue(makeProduct());

    const res = await request(app).get(`/api/product/${productId}`);

    expect(res.status).toBe(200);
    expect(body<{ product: Record<string, unknown> }>(res).product.id).toBe(productId);
    expect(cacheMock.getById).toHaveBeenCalledWith(productId);
  });

  it('should 404 for an unknown product.', async () => {
    cacheMock.getById.mockResolvedValue(null);

    const res = await request(app).get(`/api/product/${productId}`);

    expect(res.status).toBe(404);
  });

  it('should 400 for a malformed id.', async () => {
    const res = await request(app).get('/api/product/not-a-uuid');

    expect(res.status).toBe(400);
    expect(issues(res)[0].field).toBe('id');
  });
});

// ---- Admin writes ----

describe('POST /api/product (admin)', () => {
  it('should create a product and invalidate the cache.', async () => {
    const token = await loginAsAdmin();
    productRepoMock.create.mockResolvedValue(makeProduct());

    const res = await request(app)
      .post('/api/product')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Widget', price: 9.99, stock: 42 });

    expect(res.status).toBe(201);
    expect(body<{ product: Record<string, unknown> }>(res).product.name).toBe('Widget');
    expect(productRepoMock.create).toHaveBeenCalledWith(
      'Widget',
      null,
      9.99,
      42,
    );
    expect(cacheMock.invalidateAll).toHaveBeenCalledTimes(1);
  });

  it('should 403 for a non-admin.', async () => {
    getByEmailMock.mockResolvedValue({
      ...makeAdmin(),
      role: 'user',
      email: 'user@test.local',
    });
    const login = await request(app).post('/api/auth/login').send({
      email: 'user@test.local',
      password: 'admin_password_123',
    });

    const res = await request(app)
      .post('/api/product')
      .set('Authorization', `Bearer ${body<{ accessToken: string }>(login).accessToken}`)
      .send({ name: 'Widget', price: 9.99, stock: 42 });

    expect(res.status).toBe(403);
    expect(productRepoMock.create).not.toHaveBeenCalled();
  });

  it('should 401 without a token.', async () => {
    const res = await request(app)
      .post('/api/product')
      .send({ name: 'Widget', price: 9.99, stock: 42 });

    expect(res.status).toBe(401);
  });

  it('should 400 for a negative price.', async () => {
    const token = await loginAsAdmin();

    const res = await request(app)
      .post('/api/product')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Widget', price: -5, stock: 1 });

    expect(res.status).toBe(400);
    expect(issues(res)[0].field).toBe('price');
  });

  it('should 400 for negative or fractional stock.', async () => {
    const token = await loginAsAdmin();

    const res = await request(app)
      .post('/api/product')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Widget', price: 5, stock: 1.5 });

    expect(res.status).toBe(400);
    expect(issues(res)[0].field).toBe('stock');
  });
});

describe('PATCH /api/product/:id (admin)', () => {
  it('should update a product and invalidate the cache.', async () => {
    const token = await loginAsAdmin();
    productRepoMock.update.mockResolvedValue(makeProduct({ stock: 7 }));

    const res = await request(app)
      .patch(`/api/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 7 });

    expect(res.status).toBe(200);
    expect(body<{ product: Record<string, unknown> }>(res).product.stock).toBe(7);
    expect(productRepoMock.update).toHaveBeenCalledWith(productId, {
      stock: 7,
    });
    expect(cacheMock.invalidateAll).toHaveBeenCalledTimes(1);
  });

  it('should 404 for an unknown product.', async () => {
    const token = await loginAsAdmin();
    productRepoMock.update.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 7 });

    expect(res.status).toBe(404);
  });

  it('should 400 when the body has no updatable fields.', async () => {
    const token = await loginAsAdmin();

    const res = await request(app)
      .patch(`/api/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/product/:id (admin)', () => {
  it('should delete a product and invalidate the cache.', async () => {
    const token = await loginAsAdmin();
    productRepoMock.remove.mockResolvedValue(true);

    const res = await request(app)
      .delete(`/api/product/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(cacheMock.invalidateAll).toHaveBeenCalledTimes(1);
  });

  it('should 404 for an unknown product.', async () => {
    const token = await loginAsAdmin();
    productRepoMock.remove.mockResolvedValue(false);

    const res = await request(app)
      .delete(`/api/product/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
