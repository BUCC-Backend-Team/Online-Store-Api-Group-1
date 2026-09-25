import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { checkoutOrder, getUserOrders, getOrderDetails } from '../controllers/orderController.js';

const router = Router();

router.post('/checkout', verifyToken, checkoutOrder);
router.get('/', verifyToken, getUserOrders);
router.get('/:id', verifyToken, getOrderDetails);

export default router;