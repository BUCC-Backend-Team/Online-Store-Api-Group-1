import { Router } from 'express';

import * as healthController from '@src/controllers/healthController';

const router = Router();

router.get('/', healthController.check);

export default router;
