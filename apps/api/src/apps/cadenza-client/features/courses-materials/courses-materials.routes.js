import { Router } from 'express';

import { coursesController } from './courses-materials.controller.js';

import {
  idValidator,
  createValidator,
  updateValidator,
  attachmentIdValidator,
} from './courses-materials.validation.js';

import { uploadCourseMaterials } from './courses-materials.upload.js';

const router = Router();

router.get(
  '/',
  coursesController.getCourses,
);

router.get(
  '/courses/:courseId/:filename',
  coursesController.getCourseFile,
);

router.get(
  '/:id',
  idValidator,
  coursesController.getCourseById,
);

router.post(
  '/',
  uploadCourseMaterials.array('files', 10),
  createValidator,
  coursesController.createCourse,
);

router.patch(
  '/:id',
  uploadCourseMaterials.array('files', 10),
  updateValidator,
  coursesController.updateCourse,
);

router.delete(
  '/:id',
  idValidator,
  coursesController.deleteCourse,
);

router.delete(
  '/:id/attachments/:attachmentId',
  attachmentIdValidator,
  coursesController.deleteAttachment,
);

export default router;