import { Request, Response } from 'express';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import logger from '@src/common/utils/logger';
import {
  canTransition,
  IListOrdersQuery,
  OrderStatuses,
  IUpdateOrderStatusInput,
} from '@src/models/Order.model';
import CartRepo from '@src/repos/CartRepo';
import OrderRepo from '@src/repos/OrderRepo';
import productCache from '@src/repos/productCache';
import ApiError from '@src/common/utils/errors';

// Errors thrown inside placement transactions carry a user-facing message.
function isPlacementError(err: unknown): err is Error & { status?: number } {
  return err instanceof Error;
}

// POST /api/orders — place an order from the current cart.
// Demo flow: stock is reserved and prices snapshotted now; the order stays
// `pending` until POST /api/orders/:id/completed marks it paid.
export async function place(req: Request, res: Response): Promise<void> {
  const cart = await CartRepo.getCart(req.user!.id);
  if (cart.length === 0) {
    throw new ApiError(HttpStatusCodes.BAD_REQUEST, 'Cart is empty');
  }

  let order;
  try {
    order = await OrderRepo.placeFromCart(
      req.user!.id,
      cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    );
  } catch (err) {
    if (isPlacementError(err) && /stock|no longer exists/i.test(err.message)) {
      throw new ApiError(HttpStatusCodes.BAD_REQUEST, err.message);
    }
    throw err;
  }

  await productCache.invalidateAll();
  logger.info({
    type: 'security',
    event: 'order_placed',
    orderId: order.id,
    userId: req.user!.id,
    total: order.total,
    items: order.items.length,
  });
  res.status(HttpStatusCodes.CREATED).json({ status: 'success', order });
}

// GET /api/orders — customer: their own; admin: every order.
export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.validatedQuery as unknown as IListOrdersQuery;
  const isAdmin = req.user!.role === 'admin';
  const result = await OrderRepo.list({
    userId: isAdmin ? undefined : req.user!.id,
    page,
    limit,
  });
  res.status(HttpStatusCodes.OK).json({ status: 'success', ...result });
}

// GET /api/orders/:id — customers can only read their own orders.
export async function getById(req: Request, res: Response): Promise<void> {
  const order = await OrderRepo.getByIdWithItems(String(req.params.id));
  if (
    !order ||
    (req.user!.role !== 'admin' && order.userId !== req.user!.id)
  ) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Order not found');
  }
  res.status(HttpStatusCodes.OK).json({ status: 'success', order });
}

// POST /api/orders/:id/completed — demo payment: pending -> paid.
export async function complete(req: Request, res: Response): Promise<void> {
  const order = await OrderRepo.getByIdWithItems(String(req.params.id));
  if (!order || order.userId !== req.user!.id) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Order not found');
  }
  if (!canTransition(order.status, OrderStatuses.PAID)) {
    throw new ApiError(
      HttpStatusCodes.BAD_REQUEST,
      `Order is ${order.status} and cannot be completed`,
    );
  }
  const updated = await OrderRepo.updateStatus(order.id, OrderStatuses.PAID);
  logger.info({
    type: 'security',
    event: 'order_paid',
    orderId: order.id,
    userId: order.userId,
  });
  res.status(HttpStatusCodes.OK).json({ status: 'success', order: updated });
}

// PATCH /api/orders/:id/status — admin forces pending -> paid.
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body as IUpdateOrderStatusInput;
  const order = await OrderRepo.getByIdWithItems(String(req.params.id));
  if (!order) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Order not found');
  }
  if (!canTransition(order.status, status)) {
    throw new ApiError(
      HttpStatusCodes.BAD_REQUEST,
      `Cannot move order from ${order.status} to ${status}`,
    );
  }
  const updated = await OrderRepo.updateStatus(order.id, status);
  logger.info({
    type: 'security',
    event: 'order_status_updated',
    orderId: order.id,
    from: order.status,
    to: status,
    by: req.user!.id,
  });
  res.status(HttpStatusCodes.OK).json({ status: 'success', order: updated });
}

// POST /api/orders/:id/cancel — owner or admin; restores stock.
export async function cancel(req: Request, res: Response): Promise<void> {
  const order = await OrderRepo.getByIdWithItems(String(req.params.id));
  const isOwner = order && order.userId === req.user!.id;
  if (!order || (!isOwner && req.user!.role !== 'admin')) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Order not found');
  }
  if (!canTransition(order.status, OrderStatuses.CANCELLED)) {
    throw new ApiError(
      HttpStatusCodes.BAD_REQUEST,
      `Order is ${order.status} and cannot be cancelled`,
    );
  }

  // Cancel + stock restore in one transaction; the status is re-checked
  // under a row lock so concurrent cancels cannot double-restore stock.
  const updated = await OrderRepo.cancelAtomic(order.id);
  if (!updated) {
    throw new ApiError(
      HttpStatusCodes.CONFLICT,
      'Order status changed, try again',
    );
  }

  await productCache.invalidateAll();
  logger.info({
    type: 'security',
    event: 'order_cancelled',
    orderId: order.id,
    userId: order.userId,
    by: req.user!.id,
  });
  res.status(HttpStatusCodes.OK).json({ status: 'success', order: updated });
}
