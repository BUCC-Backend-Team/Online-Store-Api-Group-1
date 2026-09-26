import { CookieOptions, Request, Response } from 'express';
import bcrypt from 'bcryptjs';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import EnvVars from '@src/common/constants/env';
import logger from '@src/common/utils/logger';
import {
  ISignupInput,
  ILoginInput,
  toPublicUser,
} from '@src/models/User.model';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  IRefreshTokenPayload,
} from '@src/common/utils/jwt';
import UserRepo from '@src/repos/UserRepo';
import tokenRepo from '@src/repos/tokenRepo';
import ApiError from '@src/common/utils/errors';

const REFRESH_COOKIE = 'refresh_token';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: EnvVars.NodeEnv === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: EnvVars.Jwt.RefreshExpiresInDays * 24 * 60 * 60 * 1000,
});

// Create tokens for a user and set the refresh cookie.
async function issueTokens(
  user: { id: string; role: 'user' | 'admin' },
  res: Response,
) {
  const jti = tokenRepo.newJti();
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  await tokenRepo.store(jti, user.id);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  return accessToken;
}

// POST /api/auth/signup
export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body as ISignupInput;

  if (await UserRepo.getByEmail(email)) {
    logger.warn({ type: 'security', event: 'signup_conflict', email });
    throw new ApiError(HttpStatusCodes.CONFLICT, 'Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserRepo.create(name, email, passwordHash, 'user');

  const accessToken = await issueTokens(user, res);
  logger.info({ type: 'security', event: 'signup', userId: user.id });
  res.status(HttpStatusCodes.CREATED).json({
    status: 'success',
    user: toPublicUser(user),
    accessToken,
  });
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as ILoginInput;

  const user = await UserRepo.getByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    logger.warn({ type: 'security', event: 'login_failed', email });
    throw new ApiError(HttpStatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const accessToken = await issueTokens(user, res);
  logger.info({
    type: 'security',
    event: 'login',
    userId: user.id,
    role: user.role,
  });
  res.status(HttpStatusCodes.OK).json({
    status: 'success',
    user: toPublicUser(user),
    accessToken,
  });
}

// POST /api/auth/refresh — verifies the refresh JWT AND checks Redis.
export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    logger.warn({ type: 'security', event: 'refresh_missing_cookie' });
    throw new ApiError(HttpStatusCodes.UNAUTHORIZED, 'Refresh token missing');
  }

  let payload: IRefreshTokenPayload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    logger.warn({ type: 'security', event: 'refresh_invalid_token' });
    throw new ApiError(HttpStatusCodes.UNAUTHORIZED, 'Invalid refresh token');
  }

  // Single-use tokens: the old one is revoked, a new one is issued.
  if (!(await tokenRepo.exists(payload.jti))) {
    logger.warn({
      type: 'security',
      event: 'refresh_revoked',
      userId: payload.sub,
    });
    throw new ApiError(
      HttpStatusCodes.UNAUTHORIZED,
      'Refresh token revoked or expired',
    );
  }
  await tokenRepo.revoke(payload.jti);

  const user = await UserRepo.getById(payload.sub);
  if (!user) {
    logger.warn({
      type: 'security',
      event: 'refresh_deleted_user',
      userId: payload.sub,
    });
    throw new ApiError(HttpStatusCodes.UNAUTHORIZED, 'User no longer exists');
  }

  const accessToken = await issueTokens(user, res);
  logger.info({
    type: 'security',
    event: 'refresh',
    userId: user.id,
  });
  res.status(HttpStatusCodes.OK).json({
    status: 'success',
    user: toPublicUser(user),
    accessToken,
  });
}

// POST /api/auth/logout — revokes the refresh token and clears the cookie.
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await tokenRepo.revoke(payload.jti);
      logger.info({
        type: 'security',
        event: 'logout',
        userId: payload.sub,
      });
    } catch {
      // Expired/garbage cookie: nothing to revoke.
    }
  }
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  res.status(HttpStatusCodes.OK).json({ status: 'success' });
}
