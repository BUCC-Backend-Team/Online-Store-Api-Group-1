import { Request, Router } from 'express';

import * as authController from '@src/controllers/authController';
import { LoginSchema, SignupSchema } from '@src/models/User.model';
import ApiError from '@src/common/utils/errors';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

const router = Router();

// Validate req.body with a zod schema; throws ApiError(400) on failure.
function parseBody<T>(schema: { parse: (data: unknown) => T }) {
  return (req: Request, _res: unknown, next: (err?: unknown) => void) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const message =
        err instanceof Error && 'issues' in err
          ? (err as { issues: { message: string }[] }).issues
              .map((i) => i.message)
              .join(', ')
          : 'Invalid request body';
      next(new ApiError(HttpStatusCodes.BAD_REQUEST, message));
    }
  };
}

router.post('/signup', parseBody(SignupSchema), authController.signup);
router.post('/login', parseBody(LoginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
