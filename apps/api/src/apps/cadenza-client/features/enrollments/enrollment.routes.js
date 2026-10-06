import { Router } from 'express';

import { enrollmentController } from './enrollment.controller.js';
import {
  idValidator,
  packageInstructorValidator,
  packageInstructorAvailabilityValidator,
  createValidator,
  validateScheduleValidator,
} from './enrollment.validation.js';

import { requireClient } from '../auth/authorization.js';
import {
  asyncHandler,
  validate,
} from '../../../../common/middleware/index.js';

const router = Router();

router.get(
  '/available-packages',
  requireClient,
  asyncHandler(enrollmentController.getAvailablePackages),
);

router.get(
  '/packages/:packageId/instructors',
  requireClient,
  validate(packageInstructorValidator),
  asyncHandler(enrollmentController.getCompatibleInstructors),
);

router.get(
  '/packages/:packageId/instructors/:instructorId/availability',
  requireClient,
  validate(packageInstructorAvailabilityValidator),
  asyncHandler(enrollmentController.getInstructorAvailability),
);

router.get('/mine', requireClient, asyncHandler(enrollmentController.getMyEnrollment));

router.post(
  '/',
  requireClient,
  validate(createValidator),
  asyncHandler(enrollmentController.createEnrollment),
);

router.post(
  '/validate-schedule',
  requireClient,
  validate(validateScheduleValidator),
  asyncHandler(enrollmentController.validateSchedule),
);

router.get(
  '/:id',
  requireClient,
  validate(idValidator),
  asyncHandler(enrollmentController.getEnrollmentById),
);

router.patch(
  '/:id/cancel',
  requireClient,
  validate(idValidator),
  asyncHandler(enrollmentController.cancelEnrollment),
);

export default router;
