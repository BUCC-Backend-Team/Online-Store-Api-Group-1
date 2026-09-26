import { Router } from 'express';
import { z } from 'zod';

import * as orderController from '@src/controllers/orderController';
import {
  UpdateOrderStatusSchema,
} from '@src/models/Order.model';
import { requireAdmin, requireAuth } from '@src/middleware/auth';
import { validateBody, validateParams, validateQuery } from '@src/middleware/validate';
import { ListOrdersQuerySchema } from '@src/models/Order.model';

const router = Router();

const IdParamsSchema = z.object({ id: z.string().uuid('Invalid order id') });

router.use(requireAuth);

router.post('/', orderController.place);

// Customer: their orders. Admin: every order.
router.get('/', validateQuery(ListOrdersQuerySchema), orderController.list);

// One order; customers can only read their own
router.get('/:id', validateParams(IdParamsSchema), orderController.getById);

// Demo payment: pending - paid (owner only).
router.post(
  '/:id/completed',
  validateParams(IdParamsSchema),
  orderController.complete,
);

router.post(
  '/:id/cancel',
  validateParams(IdParamsSchema),
  orderController.cancel,
);

// Admin: pending / paid.
router.patch(
  '/:id/status',
  requireAdmin,
  validateParams(IdParamsSchema),
  validateBody(UpdateOrderStatusSchema),
  orderController.updateStatus,
);

export default router;
