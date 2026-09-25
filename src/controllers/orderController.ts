import { type Response } from 'express';
import { type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { 
  createOrderInTransaction, 
  getOrdersByUserId, 
  getOrderDetailsById 
} from '../models/orderModel.js';

export const checkoutOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty or invalid items provided' });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const newOrder = await createOrderInTransaction(userId, items, totalAmount);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: newOrder,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error during checkout' 
    });
  }
};

export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const orders = await getOrdersByUserId(req.user.id);

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getOrderDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const orderId = parseInt(req.params.id as string, 10);
    const isAdmin = req.user.role === 'admin';

    const order = await getOrderDetailsById(orderId, req.user.id, isAdmin);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or access denied' });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};