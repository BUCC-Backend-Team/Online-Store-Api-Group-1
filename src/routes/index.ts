import { Router } from 'express';

import * as healthController from '@src/controllers/healthController';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import productRoutes from './productRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';

const router = Router();

// Liveness/readiness probe (public).
router.get('/health', healthController.check);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/product', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);

export default router;
