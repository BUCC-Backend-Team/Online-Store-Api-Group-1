import { type Response } from 'express';
import { type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  createOrderFromCart,
  getOrdersByUserId,
  getOrderDetailsById,
  CheckoutError
} from '../models/orderModel.js';

const parseId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const checkoutOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await createOrderFromCart(req.user!.id);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: {
        id: order.id,
        totalAmount: Number(order.total_amount),
        status: order.status,
        createdAt: order.created_at
      }
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during checkout.' });
  }
};

export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await getOrdersByUserId(req.user!.id);

    res.status(200).json({
      success: true,
      orders: orders.map((o) => ({ ...o, total_amount: Number(o.total_amount) }))
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getOrderDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = parseId(req.params.id);
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Invalid order id.' });
    }

    const isAdmin = req.user!.role === 'admin';
    const order = await getOrderDetailsById(orderId, req.user!.id, isAdmin);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.status(200).json({
      success: true,
      order: { ...order, total_amount: Number(order.total_amount) }
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
