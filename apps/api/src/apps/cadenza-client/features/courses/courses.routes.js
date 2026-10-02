import { Router } from 'express';

import {
  requireAdmin,
  requireAdminOrFrontDesk,
} from '../auth/authorization.js';

import { coursesController } from './courses.controller.js';

import {
  idValidator,
  createValidator,
  updateValidator,
  attachmentIdValidator,
} from './courses.validation.js';

import { uploadCourseMaterials } from './courses.upload.js';

const router = Router();

router.get('/', requireAdminOrFrontDesk, coursesController.getCourses);

router.get(
  '/courses/:courseId/:filename',
  requireAdminOrFrontDesk,
  coursesController.getCourseFile,
);

router.get(
  '/:id',
  requireAdminOrFrontDesk,
  idValidator,
  coursesController.getCourseById,
);

router.post(
  '/',
  requireAdmin,
  uploadCourseMaterials.array('files', 10),
  createValidator,
  coursesController.createCourse,
);

router.patch(
  '/:id',
  requireAdmin,
  uploadCourseMaterials.array('files', 10),
  updateValidator,
  coursesController.updateCourse,
);

router.patch(
  '/:id/deactivate',
  requireAdmin,
  idValidator,
  coursesController.deactivateCourse,
);

router.delete(
  '/:id',
  requireAdmin,
  idValidator,
  coursesController.deleteCourse,
);

router.delete(
  '/:id/attachments/:attachmentId',
  requireAdmin,
  attachmentIdValidator,
  coursesController.deleteAttachment,
);

export default router;
