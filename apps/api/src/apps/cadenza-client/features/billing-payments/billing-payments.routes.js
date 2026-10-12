import { Router } from 'express';

import { requireAdminOrFrontDesk } from '../auth/authorization.js';
import { billingPaymentsController } from './billing-payments.controller.js';

const router = Router();

router.patch('/mark-paid', requireAdminOrFrontDesk, billingPaymentsController.markPaid);

export default router;
