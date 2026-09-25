import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { checkoutOrder, getUserOrders, getOrderDetails, adminUpdateOrderStatus } from '../controllers/orderController.js';

const router = Router();

router.use(verifyToken);

router.post('/checkout', checkoutOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderDetails);

// Admin-only: advance an order's status (Pending/Paid/Shipped/Delivered/Cancelled)
router.patch('/:id/status', requireRole('admin'), adminUpdateOrderStatus);

export default router;
