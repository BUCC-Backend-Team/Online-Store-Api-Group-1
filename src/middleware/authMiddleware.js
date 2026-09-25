import {} from 'express';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_me';
export const verifyToken = (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};
export const requireRole = (role) => {
    return (req, res, next) => {
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
//# sourceMappingURL=authMiddleware.js.map