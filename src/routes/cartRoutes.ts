import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  getCart,
  addToCart,
  updateCart,
  removeFromCart,
  deleteCart
} from '../controllers/cartControllers.js';

const router = Router();

router.use(verifyToken);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/:itemId', updateCart);
router.delete('/:itemId', removeFromCart);
router.delete('/', deleteCart);

export default router;
