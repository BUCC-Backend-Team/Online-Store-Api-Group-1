import { type Response } from 'express';
import { type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  getCartByUserId,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} from '../models/cartModel.js';
import { pool } from '../config/db.js';

const parseId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const getCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await getCartByUserId(req.user!.id);
    const totalPrice = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

    res.status(200).json({
      success: true,
      cart: items.map((i) => ({
        productId: i.product_id,
        name: i.name,
        price: Number(i.price),
        quantity: i.quantity
      })),
      totalPrice
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const addToCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = parseId(req.body.productId);
    const quantity = req.body.quantity;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId must be a positive integer.' });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return res.status(400).json({ success: false, message: 'quantity must be an integer between 1 and 999.' });
    }

    const productResult = await pool.query(
      `SELECT id, name, stock FROM products WHERE id = $1`,
      [productId]
    );
    const product = productResult.rows[0];

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const existing = await getCartByUserId(req.user!.id);
    const currentQty = existing.find((i) => i.product_id === productId)?.quantity ?? 0;

    if (currentQty + quantity > product.stock) {
      return res.status(409).json({
        success: false,
        message: `Insufficient stock: requested ${currentQty + quantity}, available ${product.stock}.`
      });
    }

    await addItemToCart(req.user!.id, productId, quantity);

    res.status(201).json({ success: true, message: 'Item added to cart.' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const updateCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = parseId(req.params.itemId);
    const quantity = req.body.quantity;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Invalid item id.' });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return res.status(400).json({ success: false, message: 'quantity must be an integer between 1 and 999.' });
    }

    const updated = await updateCartItem(req.user!.id, productId, quantity);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item not found in cart.' });
    }

    res.status(200).json({ success: true, message: 'Cart updated.' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const removeFromCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = parseId(req.params.itemId);

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Invalid item id.' });
    }

    const removed = await removeCartItem(req.user!.id, productId);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Item not found in cart.' });
    }

    res.status(200).json({ success: true, message: 'Item removed from cart.' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const deleteCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await clearCart(req.user!.id);
    res.status(200).json({ success: true, message: 'Cart cleared.' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
