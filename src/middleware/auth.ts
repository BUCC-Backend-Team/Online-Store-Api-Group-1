import { NextFunction, Request, Response } from 'express';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { UserRoles } from '@src/models/User.model';
import { verifyAccessToken } from '@src/common/utils/jwt';

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
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(HttpStatusCodes.UNAUTHORIZED).json({
      error: 'Missing or invalid Authorization header',
    });
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res
      .status(HttpStatusCodes.UNAUTHORIZED)
      .json({ error: 'Invalid or expired token' });
  }
}

// Require an admin access token. Must run after requireAuth.
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== UserRoles.ADMIN) {
    res
      .status(HttpStatusCodes.FORBIDDEN)
      .json({ error: 'Admin access required' });
    return;
  }
  next();
}
