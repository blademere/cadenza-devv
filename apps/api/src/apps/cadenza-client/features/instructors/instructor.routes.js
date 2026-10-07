import { Router } from 'express';
import { instructorController } from './instructor.controller.js';
import {
  requireAdminOrFrontDesk,
} from '../auth/authorization.js';

const router = Router();

router.get(
  '/',
  requireAdminOrFrontDesk,
  instructorController.getInstructors,
);

router.post(
  '/accounts',
  requireAdminOrFrontDesk,
  instructorController.createInstructorAccount,
);

router.post(
  '/',
  requireAdminOrFrontDesk,
  instructorController.createInstructor,
);

router.get(
  '/:id/availability',
  requireAdminOrFrontDesk,
  instructorController.getAvailability,
);

router.post(
  '/:id/availability',
  requireAdminOrFrontDesk,
  instructorController.addAvailability,
);

router.patch(
  '/:id/availability/:availabilityId',
  requireAdminOrFrontDesk,
  instructorController.updateAvailability,
);

router.patch(
  '/:id/availability/:availabilityId/deactivate',
  requireAdminOrFrontDesk,
  instructorController.deactivateAvailability,
);

router.get(
  '/:id/blocks',
  requireAdminOrFrontDesk,
  instructorController.getBlocks,
);

router.post(
  '/:id/blocks',
  requireAdminOrFrontDesk,
  instructorController.addBlock,
);

router.patch(
  '/:id/blocks/:blockId',
  requireAdminOrFrontDesk,
  instructorController.deleteBlock,
);

router.get(
  '/:id/check-availability',
  requireAdminOrFrontDesk,
  instructorController.checkAvailability,
);

router.get(
  '/:id',
  requireAdminOrFrontDesk,
  instructorController.getInstructorById,
);

router.patch(
  '/:id',
  requireAdminOrFrontDesk,
  instructorController.updateInstructor,
);

router.patch(
  '/:id/deactivate',
  requireAdminOrFrontDesk,
  instructorController.deactivateInstructor,
);

router.patch(
  '/:id/specialties/:courseId/deactivate',
  requireAdminOrFrontDesk,
  instructorController.deactivateCourseMapping,
);

router.post(
  '/:id/specialties',
  requireAdminOrFrontDesk,
  instructorController.addCourseMapping,
);

export default router;
