import { Router } from 'express';
import { z } from 'zod';
import { studentController } from './student.controller.js';
import { requireClient } from '../../../cadenza-client/features/auth/authorization.js';
import { asyncHandler, idempotency, validate } from '../../../../common/middleware/index.js';

const router = Router();
const requestValidator = async (req) => z.object({
  params: z.object({ sessionId: z.uuid() }),
}).parse({ params: req.params || {} });

router.use(requireClient);
router.get('/dashboard', asyncHandler(studentController.dashboard));
router.get('/schedule', asyncHandler(studentController.schedule));
router.get('/progress', asyncHandler(studentController.progress));
router.get('/materials', asyncHandler(studentController.materials));
router.get('/materials/:materialId', asyncHandler(studentController.material));
router.post(
  '/schedule/:sessionId/request',
  validate(requestValidator),
  idempotency({ scope: 'cadenza-mobile-schedule-request', required: true }),
  asyncHandler(studentController.requestSchedule),
);

export default router;
