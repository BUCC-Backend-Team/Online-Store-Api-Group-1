import { type Request, type Response } from 'express';

// Temporary in-memory cart store for local testing (keyed by sessionId or userId)
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const carts = new Map<string, CartItem[]>();

// Get user's cart
export const getCart = (req: Request, res: Response) => {
  const userId = req.headers['x-user-id']?.toString() || 'guest';
  const userCart = carts.get(userId) || [];
  
  const totalPrice = userCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.status(200).json({
    success: true,
    cart: userCart,
    totalPrice,
  });
};

// Add item to cart
export const addToCart = (req: Request, res: Response) => {
  const userId = req.headers['x-user-id']?.toString() || 'guest';
  const { productId, name, price, quantity } = req.body;

  if (!productId || !price || !quantity) {
    return res.status(400).json({ success: false, message: 'Missing required product fields' });
  }

  let userCart = carts.get(userId) || [];
  const existingItem = userCart.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    userCart.push({ productId, name, price: Number(price), quantity: Number(quantity) });
  }

  carts.set(userId, userCart);

  res.status(200).json({
    success: true,
    message: 'Item added to cart successfully',
    cart: userCart,
  });
};

// Remove item from cart
export const removeFromCart = (req: Request, res: Response) => {
  const userId = req.headers['x-user-id']?.toString() || 'guest';
  const { itemId } = req.params;

  let userCart = carts.get(userId) || [];
  userCart = userCart.filter((item) => item.productId !== itemId);
  carts.set(userId, userCart);

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    cart: userCart,
  });
};