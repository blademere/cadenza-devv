import { Router } from 'express';
import { z } from 'zod';
import { studentController } from './student.controller.js';
import { requireClient } from '../../../cadenza-client/features/auth/authorization.js';
import { asyncHandler, idempotency, validate } from '../../../../common/middleware/index.js';

const router = Router();
const requestValidator = async (req) => z.object({
  params: z.object({ sessionId: z.uuid() }),
}).parse({ params: req.params || {} });
const choiceValidator = async (req) => z.object({
  params: z.object({ sessionId: z.uuid() }),
  body: z.object({ optionIds: z.array(z.string().min(1)).min(1) }),
}).parse({ params: req.params || {}, body: req.body || {} });

router.use(requireClient);
router.get('/dashboard', asyncHandler(studentController.dashboard));
router.get('/schedule', asyncHandler(studentController.schedule));
router.get('/progress', asyncHandler(studentController.progress));
router.get('/materials', asyncHandler(studentController.materials));
router.get('/materials/:materialId', asyncHandler(studentController.material));
router.get('/materials/:materialId/file', asyncHandler(studentController.materialFile));
router.post(
  '/schedule/:sessionId/request',
  validate(requestValidator),
  idempotency({ scope: 'cadenza-mobile-schedule-request', required: true }),
  asyncHandler(studentController.requestSchedule),
);
router.post(
  '/schedule/:sessionId/choice',
  validate(choiceValidator),
  idempotency({ scope: 'cadenza-mobile-student-schedule-choice', required: true }),
  asyncHandler(studentController.chooseSchedule),
);

export default router;
