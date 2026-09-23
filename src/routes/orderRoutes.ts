import { Router } from 'express';
import type { Response } from 'express';
import { createOrder, getOrdersByUserId } from '../models/orderModel.js';
import { verifyToken, type AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// POST create a new order (Checkout)
router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { items } = req.body; // Expects an array of { productId, quantity }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized user' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart is empty or invalid items provided' });
      return;
    }

    const order = await createOrder(userId, items);
    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET user order history
router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized user' });
      return;
    }

    const orders = await getOrdersByUserId(userId);
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;