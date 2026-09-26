import { Request, Response } from 'express';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import logger from '@src/common/utils/logger';
import {
  IAddCartItemInput,
  IUpdateCartItemInput,
} from '@src/models/Cart.model';
import CartRepo from '@src/repos/CartRepo';
import ApiError from '@src/common/utils/errors';

// GET /api/cart
export async function getCart(req: Request, res: Response): Promise<void> {
  const items = await CartRepo.getCart(req.user!.id);
  res.status(HttpStatusCodes.OK).json({ items });
}

// POST /api/cart — add an item, merging quantity when it already exists.
export async function addItem(req: Request, res: Response): Promise<void> {
  const { productId, quantity } = req.body as IAddCartItemInput;

  const item = await CartRepo.addItem(req.user!.id, productId, quantity);
  if (item.quantity > item.stock) {
    logger.warn({
      type: 'security',
      event: 'cart_overstock',
      userId: req.user!.id,
      productId,
    });
    throw new ApiError(
      HttpStatusCodes.BAD_REQUEST,
      `Only ${item.stock} unit(s) of "${item.productName}" in stock`,
    );
  }

  logger.info({
    type: 'security',
    event: 'cart_item_added',
    userId: req.user!.id,
    productId,
    quantity: item.quantity,
  });
  res.status(HttpStatusCodes.CREATED).json({ item });
}

// PATCH /api/cart/:itemId — change quantity (owner only).
export async function updateItem(req: Request, res: Response): Promise<void> {
  const { quantity } = req.body as IUpdateCartItemInput;
  const item = await CartRepo.getItem(String(req.params.itemId));
  if (!item || item.userId !== req.user!.id) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Cart item not found');
  }
  if (quantity > item.stock) {
    throw new ApiError(
      HttpStatusCodes.BAD_REQUEST,
      `Only ${item.stock} unit(s) of "${item.productName}" in stock`,
    );
  }
  await CartRepo.updateQuantity(item.id, quantity);
  res.status(HttpStatusCodes.OK).json({ status: 'success' });
}

// DELETE /api/cart/:itemId — remove one item (owner only).
export async function removeItem(req: Request, res: Response): Promise<void> {
  const item = await CartRepo.getItem(String(req.params.itemId));
  if (!item || item.userId !== req.user!.id) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Cart item not found');
  }
  await CartRepo.removeItem(item.id);
  res.status(HttpStatusCodes.OK).json({ status: 'success' });
}

// DELETE /api/cart — empty the cart.
export async function clearCart(req: Request, res: Response): Promise<void> {
  await CartRepo.clearCart(req.user!.id);
  res.status(HttpStatusCodes.OK).json({ status: 'success' });
}
