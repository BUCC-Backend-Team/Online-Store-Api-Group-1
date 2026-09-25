import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { checkAccountLockout, handleFailedLogin, resetFailedLogins } from '../middleware/lockoutMiddleware.js';
import { createUser, findUserByEmail, findUserById, setRefreshToken } from '../models/userModel.js';
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, isProd } from '../config/env.js';

const ACCESS_SECRET = JWT_ACCESS_SECRET;
const REFRESH_SECRET = JWT_REFRESH_SECRET;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Token payload must match what authMiddleware.verifyToken decodes: { id, email, role }
function generateAccessToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(userId: number): string {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
}

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // Prevents JavaScript from reading the cookie (XSS protection)
    secure: isProd, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: REFRESH_COOKIE_MAX_AGE
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict'
  });
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict'
  });
}

// 1. Register: create user, hash password, auto-login (201 + tokens)
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Name is required and must be a string.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password is required and must be at least 8 characters.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Prevent user enumeration: let the DB unique constraint be the source of truth
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await createUser(name.trim(), normalizedEmail, passwordHash);

    const accessToken = generateAccessToken({ id: user.id!, email: user.email, role: user.role || 'customer' });
    const refreshToken = generateRefreshToken(user.id!);

    await setRefreshToken(user.id!, refreshToken);
    setRefreshCookie(res, refreshToken);
    // Also set the access token as a cookie so verifyToken's cookie fallback works
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // matches the 15m access token expiry
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken
    });
  } catch (error: any) {
    // 23505 = PostgreSQL unique_violation (duplicate email)
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
};

// 2. Login Controller with Refresh Token Cookie
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    // Check account lockout via Redis
    const isLocked = await checkAccountLockout(email.toLowerCase());
    if (isLocked) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed login attempts. Account is temporarily locked for 15 minutes.'
      });
    }

    // Look up the user by email
    const user = await findUserByEmail(email.toLowerCase().trim());

    // Same generic response for unknown email and wrong password (no user enumeration)
    if (!user) {
      await handleFailedLogin(email.toLowerCase());
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      await handleFailedLogin(email.toLowerCase());
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Reset failed logins on success
    await resetFailedLogins(email.toLowerCase());

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken(user.id);

    // Persist refresh token for rotation/reuse detection
    await setRefreshToken(user.id, refreshToken);
    setRefreshCookie(res, refreshToken);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
};

// 3. Refresh Token Rotation Endpoint
export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;
    if (!incomingRefreshToken) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No refresh token provided.' });
    }

    // Verify refresh token signature
    const decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET) as { userId: number };

    // Look up the user and compare the stored token (reuse detection)
    const user = await findUserById(decoded.userId);

    if (!user || user.refresh_token !== incomingRefreshToken) {
      // Token reuse detected or unknown user: invalidate the stored token
      if (user) {
        await setRefreshToken(user.id!, null);
      }
      return res.status(403).json({ success: false, message: 'Forbidden: Invalid refresh token or reuse detected.' });
    }

    // ROTATION: issue a new access token and a brand new refresh token
    const newAccessToken = generateAccessToken({ id: user.id!, email: user.email, role: user.role || 'customer' });
    const newRefreshToken = generateRefreshToken(user.id!);

    await setRefreshToken(user.id!, newRefreshToken);
    setRefreshCookie(res, newRefreshToken);
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(403).json({ success: false, message: 'Forbidden: Expired or invalid refresh token.' });
  }
};

// 4. Logout: invalidate the stored refresh token and clear cookies
export const logoutUser = async (req: Request, res: Response) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (incomingRefreshToken) {
      try {
        const decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET) as { userId: number };
        // Only clear the stored token if it matches (don't invalidate a newer session)
        const user = await findUserById(decoded.userId);
        if (user && user.refresh_token === incomingRefreshToken) {
          await setRefreshToken(user.id!, null);
        }
      } catch {
        // Expired/invalid cookie: nothing stored to invalidate
      }
    }

    clearAuthCookies(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    clearAuthCookies(res);
    return res.status(500).json({ success: false, message: 'Internal server error during logout.' });
  }
};

// 5. Get current authenticated user's profile
export const getMe = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { id: number; email: string; role: string } | undefined;

    if (!authUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const user = await findUserById(authUser.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
