import { Router } from 'express';

import * as userController from '@src/controllers/userController';
import { requireAdmin, requireAuth } from '@src/middleware/auth';

const router = Router();

router.get('/me', requireAuth, userController.getMe);
router.patch('/me', requireAuth, userController.updateMe);

router.get('/', requireAuth, requireAdmin, userController.getAll);
router.get('/:id', requireAuth, requireAdmin, userController.getById);
router.delete('/:id', requireAuth, requireAdmin, userController.remove);

export default router;
