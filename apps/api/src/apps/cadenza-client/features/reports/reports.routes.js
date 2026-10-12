import { Router } from 'express';
import { requireAdminOrFrontDesk } from '../auth/authorization.js';
import { reportsController } from './reports.controller.js';

const router = Router();
router.get('/', requireAdminOrFrontDesk, reportsController.getReport);
export default router;
