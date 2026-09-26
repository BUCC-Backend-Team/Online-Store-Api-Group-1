import { Router } from 'express';

import * as productController from '@src/controllers/productController';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ListProductsQuerySchema,
  IdParamsSchema,
} from '@src/models/Product.model';
import { requireAdmin, requireAuth } from '@src/middleware/auth';
import { validateBody, validateParams, validateQuery } from '@src/middleware/validate';

const router = Router();

// Public
router.get('/', validateQuery(ListProductsQuerySchema), productController.list);
router.get(
  '/:id',
  validateParams(IdParamsSchema),
  productController.getById,
);

// Admin
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateBody(CreateProductSchema),
  productController.create,
);
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(IdParamsSchema),
  validateBody(UpdateProductSchema),
  productController.update,
);
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(IdParamsSchema),
  productController.remove,
);

export default router;
