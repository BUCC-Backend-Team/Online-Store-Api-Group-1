import { Router } from 'express';
import { z } from 'zod';

import * as cartController from '@src/controllers/cartController';
import {
  AddCartItemSchema,
  UpdateCartItemSchema,
} from '@src/models/Cart.model';
import { requireAuth } from '@src/middleware/auth';
import { validateBody, validateParams } from '@src/middleware/validate';

const router = Router();

const ItemIdParamsSchema = z.object({
  itemId: z.string().uuid('Invalid cart item id'),
});

router.use(requireAuth);

router.get('/', cartController.getCart);
router.post('/', validateBody(AddCartItemSchema), cartController.addItem);
router.patch(
  '/:itemId',
  validateParams(ItemIdParamsSchema),
  validateBody(UpdateCartItemSchema),
  cartController.updateItem,
);
router.delete(
  '/:itemId',
  validateParams(ItemIdParamsSchema),
  cartController.removeItem,
);
router.delete('/', cartController.clearCart);

export default router;
