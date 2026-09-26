import { Router } from 'express';

import * as authController from '@src/controllers/authController';
import { LoginSchema, SignupSchema } from '@src/models/User.model';
import { validateBody } from '@src/middleware/validate';

const router = Router();

router.post('/signup', validateBody(SignupSchema), authController.signup);
router.post('/login', validateBody(LoginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
