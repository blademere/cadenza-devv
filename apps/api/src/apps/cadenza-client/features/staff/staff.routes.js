import { Router } from 'express';
import { staffController } from './staff.controller.js';
import {
  requireAdmin,
  requireAdminOrFrontDesk,
} from '../auth/authorization.js';
const router = Router();
router.get('/', requireAdminOrFrontDesk, staffController.getStaff);
router.post('/accounts', requireAdmin, staffController.createStaffAccount);
router.get('/me', requireAdminOrFrontDesk, staffController.getMyStaffProfile);
router.get('/:id', requireAdminOrFrontDesk, staffController.getStaffById);
router.post('/', requireAdmin, staffController.createStaff);
router.patch('/:id', requireAdmin, staffController.updateStaff);
router.patch('/:id/deactivate', requireAdmin, staffController.deactivateStaff);
export default router;
