import { Router } from 'express';

import {
  requireAdmin,
  requireAdminOrFrontDesk,
} from '../auth/authorization.js';

import { enrollmentPackagesController } from './enrollment-packages.controller.js';

const router = Router();

router.get(
  '/',
  requireAdminOrFrontDesk,
  enrollmentPackagesController.getEnrollmentPackages,
);

router.get(
  '/:id',
  requireAdminOrFrontDesk,
  enrollmentPackagesController.getEnrollmentPackageById,
);

router.post(
  '/',
  requireAdmin,
  enrollmentPackagesController.createEnrollmentPackage,
);

router.patch(
  '/:id',
  requireAdmin,
  enrollmentPackagesController.updateEnrollmentPackage,
);

router.patch(
  '/:id/deactivate',
  requireAdmin,
  enrollmentPackagesController.deactivateEnrollmentPackage,
);

export default router;
