import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Must match the secret used to sign access tokens in authController.ts
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super-access-secret';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Accept the token from the Authorization header first, then the cookie fallback
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const token = headerToken || req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as { id: number; email: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized request.' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: Requires '${role}' role.`
      });
    }

    next();
  };
};
