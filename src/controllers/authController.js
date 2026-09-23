import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { checkAccountLockout, handleFailedLogin, resetFailedLogins } from '../middleware/lockoutMiddleware.js';
// Import your PostgreSQL pool
// import { pool } from '../config/database.js';
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-refresh-secret';
// Helper: Generate short-lived Access Token (15 mins)
function generateAccessToken(userId, role) {
    return jwt.sign({ userId, role }, ACCESS_SECRET, { expiresIn: '15m' });
}
// Helper: Generate long-lived Refresh Token (7 days)
function generateRefreshToken(userId) {
    return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
}
// 1. Login Controller with Refresh Token Cookie
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        // Check account lockout via Redis
        const isLocked = await checkAccountLockout(email);
        if (isLocked) {
            return res.status(429).json({
                error: 'Too many failed login attempts. Account is temporarily locked for 15 minutes.'
            });
        }
        // Query database for user (uncomment when database pool is imported)
        // const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        // const user = result.rows[0];
        // Placeholder mock user for demonstration:
        const user = { id: '1', email: 'test@store.com', role: 'customer', passwordHash: '...' };
        if (!user) {
            await handleFailedLogin(email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Verify password hash
        // const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        const isPasswordValid = true; // Replace with actual bcrypt check
        if (!isPasswordValid) {
            await handleFailedLogin(email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Reset failed logins on success
        await resetFailedLogins(email);
        // Generate tokens
        const accessToken = generateAccessToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);
        // Save refresh token in database
        // await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);
        // Send refresh token securely in an HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // Prevents JavaScript from reading the cookie (XSS protection)
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict', // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        // Return short-lived access token in JSON body
        return res.status(200).json({
            message: 'Login successful',
            accessToken
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
// 2. Refresh Token Rotation Endpoint
export const refreshAccessToken = async (req, res) => {
    try {
        // Read the cookie sent by the browser
        const cookies = req.cookies;
        if (!cookies?.refreshToken) {
            return res.status(401).json({ error: 'Unauthorized: No refresh token provided' });
        }
        const incomingRefreshToken = cookies.refreshToken;
        // Verify refresh token signature
        const decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET);
        // Check user in database
        // const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        // const user = result.rows[0];
        // Placeholder mock user lookup:
        const user = { id: decoded.userId, role: 'customer', refresh_token: incomingRefreshToken };
        // If token reuse is detected (stored token doesn't match incoming token)
        if (!user || user.refresh_token !== incomingRefreshToken) {
            // Security measure: Clear token in DB to invalidate session
            // await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [decoded.userId]);
            return res.status(403).json({ error: 'Forbidden: Invalid refresh token signature or reuse detected' });
        }
        // ROTATION: Issue new access token and a brand new refresh token
        const newAccessToken = generateAccessToken(user.id, user.role);
        const newRefreshToken = generateRefreshToken(user.id);
        // Update database with the new refresh token
        // await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefreshToken, user.id]);
        // Set new refresh token cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.status(200).json({ accessToken: newAccessToken });
    }
    catch (error) {
        console.error('Refresh token error:', error);
        return res.status(403).json({ error: 'Forbidden: Expired or invalid refresh token' });
    }
};
//# sourceMappingURL=authController.js.map