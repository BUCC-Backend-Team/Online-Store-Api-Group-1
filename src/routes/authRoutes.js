import { Router } from 'express';
import { loginUser, refreshAccessToken } from '../controllers/authController.js';
const router = Router();
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
export default router;
//# sourceMappingURL=authRoutes.js.map