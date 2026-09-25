import { Router } from 'express';
import { getProducts, addProduct } from '../controllers/productController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getProducts);
router.post('/', verifyToken, requireRole('admin'), addProduct);

export default router;