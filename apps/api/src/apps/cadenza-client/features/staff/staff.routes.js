import { Router } from 'express';

import { staffController } from './staff.controller.js';
import authorize from '../../../../platform/authorization/authorization.middleware.js';

const router = Router();

router.get('/', authorize('cadenza_staff:read'), staffController.getStaff);

router.post(
  '/accounts',
  authorize('cadenza_staff:create'),
  staffController.createStaffAccount,
);

router.get(
  '/me',
  authorize('cadenza_staff:read'),
  staffController.getMyStaffProfile,
);

router.get(
  '/:id',
  authorize('cadenza_staff:read'),
  staffController.getStaffById,
);

router.post(
  '/',
  authorize('cadenza_staff:create'),
  staffController.createStaff,
);

router.patch(
  '/:id',
  authorize('cadenza_staff:update'),
  staffController.updateStaff,
);

router.patch(
  '/:id/deactivate',
  authorize('cadenza_staff:update'),
  staffController.deactivateStaff,
);

export default router;
