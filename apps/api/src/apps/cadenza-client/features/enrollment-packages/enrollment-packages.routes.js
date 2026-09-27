import { Router } from 'express'

import authorize from '../../../../platform/authorization/authorization.middleware.js'

import { enrollmentPackagesController } from './enrollment-packages.controller.js'

const router = Router()

router.get(
  '/',
  authorize('cadenza_lesson_packages:read'),
  enrollmentPackagesController.getEnrollmentPackages,
)

router.get(
  '/:id',
  authorize('cadenza_lesson_packages:read'),
  enrollmentPackagesController.getEnrollmentPackageById,
)

router.post(
  '/',
  authorize('cadenza_lesson_packages:create'),
  enrollmentPackagesController.createEnrollmentPackage,
)

router.patch(
  '/:id',
  authorize('cadenza_lesson_packages:update'),
  enrollmentPackagesController.updateEnrollmentPackage,
)

router.patch(
  '/:id/deactivate',
  authorize('cadenza_lesson_packages:update'),
  enrollmentPackagesController.deactivateEnrollmentPackage,
)

export default router