import request from 'supertest';
import bcrypt from 'bcryptjs';

import app from '@src/server';
import * as UserRepo from '@src/repos/UserRepo';
import * as CartRepo from '@src/repos/CartRepo';
import * as OrderRepo from '@src/repos/OrderRepo';
import productCache from '@src/repos/productCache';
import type {
  IOrder,
  IOrderWithItems,
} from '@src/models/Order.model';
import type { ICartItem } from '@src/models/Cart.model';
import type { IUser } from '@src/models/User.model';

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

vi.mock('@src/repos/CartRepo', (): typeof import('@src/repos/CartRepo') => {
  const mock = {
    getCart: vi.fn(),
    getItem: vi.fn(),
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
  };
  return { ...mock, default: mock };
});

vi.mock('@src/repos/OrderRepo', (): typeof import('@src/repos/OrderRepo') => {
  const mock = {
    getByIdWithItems: vi.fn(),
    list: vi.fn(),
    placeFromCart: vi.fn(),
    updateStatus: vi.fn(),
    restoreStock: vi.fn(),
    cancelAtomic: vi.fn(),
  };
  return { ...mock, default: mock };
});

vi.mock('@src/repos/productCache', () => ({
  default: {
    list: vi.fn(),
    getById: vi.fn(),
    invalidateAll: vi.fn(),
  },
}));

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

vi.mock('@src/config/db', () => ({
  default: {
    pool: { query: vi.fn() },
    connectDb: vi.fn(),
    closeDb: vi.fn(),
    withTransaction: vi.fn(),
  },
}));

vi.mock('@src/config/redis', () => ({
  default: {
    client: { on: vi.fn() },
    ensureConnected: vi.fn(),
    connectRedis: vi.fn(),
    closeRedis: vi.fn(),
  },
}));

// ---- Mock handles ----

const getByEmailMock = vi.mocked(UserRepo.getByEmail);
const cartGetCartMock = vi.mocked(CartRepo.getCart);
const orderMock = {
  getByIdWithItems: vi.mocked(OrderRepo.getByIdWithItems),
  list: vi.mocked(OrderRepo.list),
  placeFromCart: vi.mocked(OrderRepo.placeFromCart),
  updateStatus: vi.mocked(OrderRepo.updateStatus),
  cancelAtomic: vi.mocked(OrderRepo.cancelAtomic),
};
const cacheInvalidateMock = vi.mocked(productCache.invalidateAll);

// ---- Fixtures ----

const userId = '22222222-2222-4222-8222-222222222222';
const adminId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '55555555-5555-4555-8555-555555555555';
const productId = '33333333-3333-4333-8333-333333333333';
const orderId = '66666666-6666-4666-8666-666666666666';

function makeUser(over: Partial<IUser> = {}): IUser {
  return {
    id: userId,
    name: 'Test User',
    email: 'user@test.local',
    passwordHash: bcrypt.hashSync('Password123', 10),
    role: 'user',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
  };
}

function makeCartItem(): ICartItem {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    productId,
    productName: 'Widget',
    quantity: 2,
    price: '9.99',
    stock: 10,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function makeOrder(over: Partial<IOrder> = {}): IOrderWithItems {
  return {
    id: orderId,
    userId,
    status: 'pending',
    total: '19.98',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    items: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        orderId,
        productId,
        productName: 'Widget',
        unitPrice: '9.99',
        quantity: 2,
      },
    ],
    ...over,
  };
}

async function login(as: 'user' | 'admin' = 'user') {
  getByEmailMock.mockResolvedValue(
    as === 'admin'
      ? makeUser({
          id: adminId,
          role: 'admin',
          email: 'admin@test.local',
          passwordHash: bcrypt.hashSync('admin_password_123', 10),
        })
      : makeUser(),
  );
  const res = await request(app).post('/api/auth/login').send({
    email: as === 'admin' ? 'admin@test.local' : 'user@test.local',
    password: as === 'admin' ? 'admin_password_123' : 'Password123',
  });
  return body<{ accessToken: string }>(res).accessToken;
}

function body<T>(res: { body: unknown }): T {
  return res.body as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  cacheInvalidateMock.mockResolvedValue(undefined);
});

describe('POST /api/orders (place)', () => {
  it('should place an order from the cart and clear it.', async () => {
    const token = await login();
    cartGetCartMock.mockResolvedValue([makeCartItem()]);
    orderMock.placeFromCart.mockResolvedValue(makeOrder());

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(body<{ order: IOrderWithItems }>(res).order.total).toBe('19.98');
    expect(orderMock.placeFromCart).toHaveBeenCalledWith(userId, [
      { productId, quantity: 2 },
    ]);
    expect(cacheInvalidateMock).toHaveBeenCalledTimes(1);
  });

  it('should 400 when the cart is empty.', async () => {
    const token = await login();
    cartGetCartMock.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(body<{ error: string }>(res).error).toMatch(/empty/i);
  });

  it('should 400 when stock is insufficient.', async () => {
    const token = await login();
    cartGetCartMock.mockResolvedValue([makeCartItem()]);
    orderMock.placeFromCart.mockRejectedValue(
      new Error('Insufficient stock for "Widget" (requested 2, available 0)'),
    );

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(body<{ error: string }>(res).error).toMatch(/insufficient stock/i);
  });
});

describe('GET /api/orders', () => {
  it('should list only the customer\'s own orders.', async () => {
    const token = await login();
    orderMock.list.mockResolvedValue({
      orders: [makeOrder()],
      total: 1,
      page: 1,
      pages: 1,
    });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(orderMock.list).toHaveBeenCalledWith(
      expect.objectContaining({ userId }),
    );
  });

  it('should list every order for an admin.', async () => {
    const token = await login('admin');
    orderMock.list.mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      pages: 1,
    });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(orderMock.list).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined }),
    );
  });
});

describe('GET /api/orders/:id', () => {
  it('should return the owner their order.', async () => {
    const token = await login();
    orderMock.getByIdWithItems.mockResolvedValue(makeOrder());

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(body<{ order: IOrderWithItems }>(res).order.items).toHaveLength(1);
  });

  it('should hide other users\' orders from customers.', async () => {
    const token = await login();
    orderMock.getByIdWithItems.mockResolvedValue(
      makeOrder({ userId: otherUserId }),
    );

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should let an admin read any order.', async () => {
    const token = await login('admin');
    orderMock.getByIdWithItems.mockResolvedValue(
      makeOrder({ userId: otherUserId }),
    );

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

describe('POST /api/orders/:id/completed', () => {
  it('should mark a pending order paid (owner).', async () => {
    const token = await login();
    orderMock.getByIdWithItems.mockResolvedValue(makeOrder());
    orderMock.updateStatus.mockResolvedValue(
      makeOrder({ status: 'paid' }),
    );

    const res = await request(app)
      .post(`/api/orders/${orderId}/completed`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(orderMock.updateStatus).toHaveBeenCalledWith(orderId, 'paid');
  });

  it('should 400 when the order is already paid.', async () => {
    const token = await login();
    orderMock.getByIdWithItems.mockResolvedValue(
      makeOrder({ status: 'paid' }),
    );

    const res = await request(app)
      .post(`/api/orders/${orderId}/completed`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(body<{ error: string }>(res).error).toMatch(/cannot be completed/i);
  });

  it('should 404 for another user\'s order.', async () => {
    const token = await login();
    orderMock.getByIdWithItems.mockResolvedValue(
      makeOrder({ userId: otherUserId }),
    );

    const res = await request(app)
      .post(`/api/orders/${orderId}/completed`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/orders/:id/status (admin)', () => {
  it('should move pending to paid.', async () => {
    const token = await login('admin');
    orderMock.getByIdWithItems.mockResolvedValue(makeOrder());
    orderMock.updateStatus.mockResolvedValue(makeOrder({ status: 'paid' }));

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    expect(res.status).toBe(200);
    expect(orderMock.updateStatus).toHaveBeenCalledWith(orderId, 'paid');
  });

  it('should 403 for non-admins.', async () => {
    const token = await login();

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    expect(res.status).toBe(403);
  });

  it('should 400 for an illegal transition (paid -> paid via cancel path).', async () => {
    const token = await login('admin');
    orderMock.getByIdWithItems.mockResolvedValue(
      makeOrder({ status: 'cancelled' }),
    );

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    expect(res.status).toBe(400);
    expect(body<{ error: string }>(res).error).toMatch(/cannot move order/i);
  });
});

describe('POST /api/orders/:id/cancel', () => {
  it('should cancel a pending order and restore stock.', async () => {
    const token = await login();
    orderMock.getByIdWithItems.mockResolvedValue(makeOrder());
    orderMock.cancelAtomic.mockResolvedValue(
      makeOrder({ status: 'cancelled' }),
    );

    const res = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(orderMock.cancelAtomic).toHaveBeenCalledWith(orderId);
    expect(cacheInvalidateMock).toHaveBeenCalledTimes(1);
  });

  it('should let an admin cancel a paid order.', async () => {
    const token = await login('admin');
    orderMock.getByIdWithItems.mockResolvedValue(
      makeOrder({ status: 'paid' }),
    );
    orderMock.cancelAtomic.mockResolvedValue(
      makeOrder({ status: 'cancelled' }),
    );

    const res = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('should 404 for another user\'s order.', async () => {
    const token = await login();
    orderMock.getByIdWithItems.mockResolvedValue(
      makeOrder({ userId: otherUserId }),
    );

    const res = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should 409 when the status changed concurrently.', async () => {
    const token = await login();
    orderMock.getByIdWithItems.mockResolvedValue(makeOrder());
    orderMock.cancelAtomic.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });
});
