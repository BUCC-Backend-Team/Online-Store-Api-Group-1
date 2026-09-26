import request, { Response } from 'supertest';
import bcrypt from 'bcryptjs';

import app from '@src/server';
import * as UserRepo from '@src/repos/UserRepo';
import tokenRepo from '@src/repos/tokenRepo';
import type { IUser } from '@src/models/User.model';
import { verifyAccessToken } from '@src/common/utils/jwt';

// Mock only the DB/Redis layers; JWT + bcrypt + validation run for real.
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

// ---- Typed mock handles ----

const userRepoMock = vi.mocked(UserRepo.default);
const getByEmailMock = userRepoMock.getByEmail;
const getByIdMock = userRepoMock.getById;
const getAllMock = userRepoMock.getAll;
const createMock = userRepoMock.create;
const updateProfileMock = userRepoMock.updateProfile;
const removeMock = userRepoMock.remove;
const tokenRepoMock = vi.mocked(tokenRepo);
const tokenStoreMock = tokenRepoMock.store;
const tokenExistsMock = tokenRepoMock.exists;
const tokenRevokeMock = tokenRepoMock.revoke;
const tokenRevokeAllForUserMock = tokenRepoMock.revokeAllForUser;

// ---- Fixtures ----

// Type a supertest response body.
function body<T>(res: Response): T {
  return res.body as T;
}

const adminId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

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

function mockAdmin() {
  getByEmailMock.mockResolvedValue(
    makeUser({
      id: adminId,
      email: 'admin@test.local',
      role: 'admin',
      name: 'Admin',
      passwordHash: bcrypt.hashSync('admin_password_123', 10),
    }),
  );
}

// Login as the env admin, return { accessToken, cookie }.
async function loginAsAdmin() {
  mockAdmin();
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@test.local',
    password: 'admin_password_123',
  });
  const raw = res.headers['set-cookie'] as string[] | string | undefined;
  const cookieHeader = Array.isArray(raw) ? raw[0] : raw;
  return {
    accessToken: body<{ accessToken: string }>(res).accessToken,
    cookie: cookieHeader as string,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---- Auth ----

describe('POST /api/auth/signup', () => {
  it('should create a user, return an access token, and set the refresh cookie.', async () => {
    getByEmailMock.mockResolvedValue(null);
    createMock.mockResolvedValue(makeUser({ passwordHash: 'hash' }));

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'user@test.local',
      password: 'Password123',
      passwordConfirm: 'Password123',
    });

    expect(res.status).toBe(201);
    expect(body<{ status: string }>(res).status).toBe('success');
    expect(body<{ user: Record<string, unknown> }>(res).user).not.toHaveProperty('passwordHash');
    expect(body<{ accessToken: string }>(res).accessToken).toBeTruthy();
    expect(res.headers['set-cookie'][0]).toMatch(/refresh_token=/);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(verifyAccessToken(body<{ accessToken: string }>(res).accessToken).role).toBe('user');
    expect(tokenStoreMock).toHaveBeenCalledWith('test-jti', userId);
  });

  it('should 409 when the email is already registered.', async () => {
    getByEmailMock.mockResolvedValue(makeUser());

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'user@test.local',
      password: 'Password123',
      passwordConfirm: 'Password123',
    });

    expect(res.status).toBe(409);
  });

  it('should 400 when passwords do not match.', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'user@test.local',
      password: 'Password123',
      passwordConfirm: 'Different123',
    });

    expect(res.status).toBe(400);
  });

  it('should 400 when fields are missing or invalid.', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(body<{ error: string }>(res).error).toBeTruthy();
  });
});

describe('POST /api/auth/login', () => {
  it('should return tokens for valid credentials.', async () => {
    mockAdmin();

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.local',
      password: 'admin_password_123',
    });

    expect(res.status).toBe(200);
    expect(body<{ accessToken: string }>(res).accessToken).toBeTruthy();
    expect(verifyAccessToken(body<{ accessToken: string }>(res).accessToken).role).toBe('admin');
    expect(res.headers['set-cookie'][0]).toMatch(/refresh_token=/);
  });

  it('should 401 for a wrong password.', async () => {
    mockAdmin();

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.local',
      password: 'wrong_password',
    });

    expect(res.status).toBe(401);
  });

  it('should 401 for an unknown email.', async () => {
    getByEmailMock.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.local',
      password: 'Password123',
    });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('should rotate the refresh token and return a new access token.', async () => {
    const { cookie } = await loginAsAdmin();
    tokenExistsMock.mockResolvedValue(true);
    getByIdMock.mockResolvedValue(
      makeUser({ id: adminId, role: 'admin' }),
    );

    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(body<{ accessToken: string }>(res).accessToken).toBeTruthy();
    expect(tokenExistsMock).toHaveBeenCalledWith('test-jti');
    expect(tokenRevokeMock).toHaveBeenCalledWith('test-jti');
    expect(tokenStoreMock).toHaveBeenCalledWith('test-jti', adminId);
  });

  it('should 401 when the token is not in Redis (revoked).', async () => {
    const { cookie } = await loginAsAdmin();
    tokenExistsMock.mockResolvedValue(false);

    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);

    expect(res.status).toBe(401);
    expect(body<{ error: string }>(res).error).toMatch(/revoked/i);
  });

  it('should 401 without a cookie.', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
  });
});

// ---- Users ----

describe('GET /api/users/me', () => {
  it('should return the current user for a valid token.', async () => {
    const { accessToken } = await loginAsAdmin();
    getByIdMock.mockResolvedValue(
      makeUser({ id: adminId, role: 'admin' }),
    );

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(body<{ user: Record<string, unknown> }>(res).user.id).toBe(adminId);
    expect(body<{ user: Record<string, unknown> }>(res).user).not.toHaveProperty('passwordHash');
  });

  it('should 401 without a token.', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/users/me', () => {
  it('should update the current user name.', async () => {
    const { accessToken } = await loginAsAdmin();
    updateProfileMock.mockResolvedValue(
      makeUser({ id: adminId, name: 'New Name', role: 'admin' }),
    );

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(body<{ user: Record<string, unknown> }>(res).user.name).toBe('New Name');
  });

  it('should 400 for an invalid email.', async () => {
    const { accessToken } = await loginAsAdmin();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'nope' });

    expect(res.status).toBe(400);
  });
});

describe('Admin routes', () => {
  it('should list all users for an admin.', async () => {
    const { accessToken } = await loginAsAdmin();
    getAllMock.mockResolvedValue([
      makeUser(),
      makeUser({ id: adminId, role: 'admin', email: 'admin@test.local' }),
    ]);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(body<{ users: Record<string, unknown>[] }>(res).users).toHaveLength(2);
    expect(
      body<{ users: Record<string, unknown>[] }>(res).users[0],
    ).not.toHaveProperty('passwordHash');
  });

  it('should 403 for a non-admin on admin routes.', async () => {
    getByEmailMock.mockResolvedValue(makeUser());
    const login = await request(app).post('/api/auth/login').send({
      email: 'user@test.local',
      password: 'Password123',
    });

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${body<{ accessToken: string }>(login).accessToken}`);

    expect(res.status).toBe(403);
  });

  it('should return a single user by id for an admin.', async () => {
    const { accessToken } = await loginAsAdmin();
    getByIdMock.mockResolvedValue(makeUser());

    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(body<{ user: Record<string, unknown> }>(res).user.id).toBe(userId);
  });

  it('should 404 for an unknown user id.', async () => {
    const { accessToken } = await loginAsAdmin();
    getByIdMock.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('should delete a user and revoke their tokens.', async () => {
    const { accessToken } = await loginAsAdmin();
    removeMock.mockResolvedValue(true);

    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(removeMock).toHaveBeenCalledWith(userId);
    expect(tokenRevokeAllForUserMock).toHaveBeenCalledWith(userId);
  });

  it('should block an admin from deleting themselves.', async () => {
    const { accessToken } = await loginAsAdmin();

    const res = await request(app)
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('should 400 with a field detail for a malformed user id.', async () => {
    const { accessToken } = await loginAsAdmin();

    const res = await request(app)
      .get('/api/users/not-a-uuid')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(errorMsg(res)).toBe('Validation failed');
    expect(issues(res)[0]).toMatchObject({
      field: 'id',
      message: 'Invalid user id',
    });
  });
});

// ---- Validation & error response shapes ----

type Issue = { field: string; message: string };

function issues(res: { body: unknown }): Issue[] {
  return (res.body as { details: Issue[] }).details ?? [];
}

function errorMsg(res: { body: unknown }): string {
  return (res.body as { error: string }).error;
}

describe('Validation and error responses', () => {
  it('should reject weak passwords with field details.', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'user@test.local',
      password: 'alllowercase1',
      passwordConfirm: 'alllowercase1',
    });

    expect(res.status).toBe(400);
    expect(errorMsg(res)).toBe('Validation failed');
    const pwIssue = issues(res).find((i) => i.field === 'password');
    expect(pwIssue?.message).toMatch(/uppercase/i);
  });

  it('should reject an invalid email with a field detail.', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'not-an-email',
      password: 'Password123',
      passwordConfirm: 'Password123',
    });

    expect(res.status).toBe(400);
    const emailIssue = issues(res).find((i) => i.field === 'email');
    expect(emailIssue?.message).toMatch(/email/i);
  });

  it('should report both password rules in one response.', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'T',
      email: 'user@test.local',
      password: 'short',
      passwordConfirm: 'short',
    });

    expect(res.status).toBe(400);
    const pwIssues = issues(res).filter((i) => i.field === 'password');
    expect(pwIssues.length).toBeGreaterThanOrEqual(2);
  });

  it('should not leak a stack trace for unexpected errors.', async () => {
    // Force an unexpected error inside a controller.
    getByEmailMock.mockRejectedValue(new Error('boom: secret internals'));

    const res = await request(app).post('/api/auth/login').send({
      email: 'user@test.local',
      password: 'Password123',
    });

    expect(res.status).toBe(500);
    expect(res.body).toStrictEqual({ error: 'Internal Server Error' });
    expect(JSON.stringify(res.body)).not.toMatch(/boom/);
  });

  it('should normalize signup email to lowercase.', async () => {
    getByEmailMock.mockResolvedValue(null);
    createMock.mockResolvedValue(
      makeUser({ email: 'mixed@TEST.local', passwordHash: 'hash' }),
    );

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: '  Mixed@TEST.Local  ',
      password: 'Password123',
      passwordConfirm: 'Password123',
    });

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      'Test User',
      'mixed@test.local',
      expect.any(String),
      'user',
    );
  });

  it('should 400 when PATCH /me has no updatable fields.', async () => {
    const { accessToken } = await loginAsAdmin();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(errorMsg(res)).toBe('Validation failed');
  });
});
