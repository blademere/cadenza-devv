import { Router } from 'express';
import { requireAdminOrFrontDesk } from '../auth/authorization.js';
import { billingPaymentsController } from './billing-payments.controller.js';
const router = Router();
router.get('/transactions', requireAdminOrFrontDesk, billingPaymentsController.listPayments);
router.post('/transactions', requireAdminOrFrontDesk, billingPaymentsController.recordPayment);
export default router;
