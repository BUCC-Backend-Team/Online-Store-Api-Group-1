import jwt from 'jsonwebtoken';
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access denied. Token missing.' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};
// Role-Based Access Control Middleware
export const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized: No user session found' });
            return;
        }
        if (req.user.role !== requiredRole) {
            res.status(403).json({
                error: `Access denied: Requires '${requiredRole}' role, but you are logged in as '${req.user.role}'`
            });
            return;
        }
        next();
    };
};
//# sourceMappingURL=authMiddleware.js.map