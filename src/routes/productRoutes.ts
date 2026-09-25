import { Router } from 'express';
import { getProducts, getProduct, addProduct } from '../controllers/productController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { validateProduct } from '../middleware/validationMiddleware.js';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', verifyToken, requireRole('admin'), validateProduct, addProduct);

export default router;
