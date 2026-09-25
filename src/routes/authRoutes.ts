import { Router } from 'express';
import { registerUser, loginUser, refreshAccessToken, getMe } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.get('/me', verifyToken, getMe);

export default router;