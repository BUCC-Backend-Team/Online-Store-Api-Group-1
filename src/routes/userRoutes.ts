import { Router } from 'express';
import { z } from 'zod';

import * as userController from '@src/controllers/userController';
import { UpdateMeSchema } from '@src/models/User.model';
import { requireAdmin, requireAuth } from '@src/middleware/auth';
import { validateBody, validateParams } from '@src/middleware/validate';

const router = Router();

const IdParamsSchema = z.object({ id: z.string().uuid('Invalid user id') });

router.get('/me', requireAuth, userController.getMe);
router.patch(
  '/me',
  requireAuth,
  validateBody(UpdateMeSchema),
  userController.updateMe,
);

router.get('/', requireAuth, requireAdmin, userController.getAll);
router.get(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(IdParamsSchema),
  userController.getById,
);
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(IdParamsSchema),
  userController.remove,
);

export default router;
