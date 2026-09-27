import { NextFunction, Request, Response } from 'express';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { UserRoles } from '@src/models/User.model';
import { verifyAccessToken } from '@src/common/utils/jwt';
import ApiError from '@src/common/utils/errors';

export interface IAuthUser {
  id: string;
  role: 'user' | 'admin';
}

// Extend Express Request with the authenticated user and validated query.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IAuthUser;
      validatedQuery?: Record<string, unknown>;
    }
  }
}

// Require a valid bearer access token.
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(
      new ApiError(
        HttpStatusCodes.UNAUTHORIZED,
        'Missing or invalid Authorization header',
      ),
    );
  }
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new ApiError(HttpStatusCodes.UNAUTHORIZED, 'Invalid or expired token'));
  }
}

// Require an admin access token. Must run after requireAuth.
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== UserRoles.ADMIN) {
    return next(
      new ApiError(HttpStatusCodes.FORBIDDEN, 'Admin access required'),
    );
  }
  next();
}
