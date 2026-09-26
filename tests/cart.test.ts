import request from 'supertest';
import bcrypt from 'bcryptjs';

import app from '@src/server';
import * as UserRepo from '@src/repos/UserRepo';
import * as CartRepo from '@src/repos/CartRepo';
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

import tokenRepo from '@src/repos/tokenRepo';

// ---- Mock handles ----

const getByEmailMock = vi.mocked(UserRepo.getByEmail);
const cartMock = {
  getCart: vi.mocked(CartRepo.getCart),
  getItem: vi.mocked(CartRepo.getItem),
  addItem: vi.mocked(CartRepo.addItem),
  updateQuantity: vi.mocked(CartRepo.updateQuantity),
  removeItem: vi.mocked(CartRepo.removeItem),
  clearCart: vi.mocked(CartRepo.clearCart),
};
const tokenStoreMock = vi.mocked(tokenRepo.store);

// ---- Fixtures ----

const userId = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';
const itemId = '44444444-4444-4444-8444-444444444444';

function makeUser(): IUser {
  return {
    id: userId,
    name: 'Test User',
    email: 'user@test.local',
    passwordHash: bcrypt.hashSync('Password123', 10),
    role: 'user',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function makeItem(over: Partial<ICartItem> = {}): ICartItem {
  return {
    id: itemId,
    productId,
    productName: 'Widget',
    quantity: 2,
    price: '9.99',
    stock: 10,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
  };
}

async function login() {
  getByEmailMock.mockResolvedValue(makeUser());
  const res = await request(app).post('/api/auth/login').send({
    email: 'user@test.local',
    password: 'Password123',
  });
  return body<{ accessToken: string }>(res).accessToken;
}

// Typed accessors for supertest response bodies.
function body<T>(res: { body: unknown }): T {
  return res.body as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenStoreMock.mockResolvedValue(undefined);
});

describe('GET /api/cart', () => {
  it('should return the current user cart.', async () => {
    const token = await login();
    cartMock.getCart.mockResolvedValue([makeItem()]);

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(body<{ items: unknown[] }>(res).items).toHaveLength(1);
    expect(cartMock.getCart).toHaveBeenCalledWith(userId);
  });

  it('should 401 without a token.', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/cart', () => {
  it('should add an item.', async () => {
    const token = await login();
    cartMock.addItem.mockResolvedValue(makeItem());

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(201);
    expect(cartMock.addItem).toHaveBeenCalledWith(userId, productId, 2);
  });

  it('should 400 when quantity exceeds stock.', async () => {
    const token = await login();
    cartMock.addItem.mockResolvedValue(makeItem({ quantity: 50, stock: 10 }));

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 50 });

    expect(res.status).toBe(400);
    expect(body<{ error: string }>(res).error).toMatch(/in stock/i);
  });

  it('should 400 for an invalid product id.', async () => {
    const token = await login();

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'nope', quantity: 1 });

    expect(res.status).toBe(400);
    expect(body<{ error: string }>(res).error).toBe('Validation failed');
  });
});

describe('PATCH /api/cart/:itemId', () => {
  it('should update quantity for the owner.', async () => {
    const token = await login();
    cartMock.getItem.mockResolvedValue({ ...makeItem(), userId });

    const res = await request(app)
      .patch(`/api/cart/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(cartMock.updateQuantity).toHaveBeenCalledWith(itemId, 5);
  });

  it('should 404 for another user\'s item.', async () => {
    const token = await login();
    cartMock.getItem.mockResolvedValue({
      ...makeItem(),
      userId: '55555555-5555-4555-8555-555555555555',
    });

    const res = await request(app)
      .patch(`/api/cart/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/cart/:itemId', () => {
  it('should remove the owner\'s item.', async () => {
    const token = await login();
    cartMock.getItem.mockResolvedValue({ ...makeItem(), userId });
    cartMock.removeItem.mockResolvedValue(true);

    const res = await request(app)
      .delete(`/api/cart/${itemId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(cartMock.removeItem).toHaveBeenCalledWith(itemId);
  });
});

describe('DELETE /api/cart', () => {
  it('should clear the cart.', async () => {
    const token = await login();
    cartMock.clearCart.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(cartMock.clearCart).toHaveBeenCalledWith(userId);
  });
});
