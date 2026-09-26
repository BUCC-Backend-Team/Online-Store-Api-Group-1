import { Router } from 'express';

import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import productRoutes from './productRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/product', productRoutes);

export default router;
