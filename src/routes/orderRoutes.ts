import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { checkoutOrder, getUserOrders, getOrderDetails } from '../controllers/orderController.js';

const router = Router();

router.use(verifyToken);

router.post('/checkout', checkoutOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderDetails);

export default router;
