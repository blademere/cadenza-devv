import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, idempotency, validate } from '../../../../common/middleware/index.js';
import requireInstructor from '../../middleware/require-instructor.js';
import { instructorController } from './instructor.controller.js';

const router = Router();
const attendanceValidator = async (req) => z.object({
  body: z.object({
    sessionId: z.uuid(),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'NO_SHOW', 'COMPLETED', 'ATTENDED']),
    notes: z.string().max(2000).optional().default(''),
  }),
}).parse({ body: req.body || {} });
const rescheduleValidator = async (req) => z.object({
  params: z.object({ sessionId: z.uuid() }),
  body: z.object({ requestedStart: z.coerce.date(), reason: z.string().max(1000).optional().default('') }),
}).parse({ params: req.params || {}, body: req.body || {} });

router.use(requireInstructor);
router.get('/dashboard', asyncHandler(instructorController.dashboard));
router.get('/schedule', asyncHandler(instructorController.schedule));
router.get('/progress', asyncHandler(instructorController.progress));
router.get('/attendance', asyncHandler(instructorController.attendance));
router.post('/attendance', validate(attendanceValidator), idempotency({ scope: 'cadenza-mobile-instructor-attendance', required: true }), asyncHandler(instructorController.recordAttendance));
router.post('/schedule/:sessionId/request', validate(rescheduleValidator), idempotency({ scope: 'cadenza-mobile-instructor-reschedule', required: true }), asyncHandler(instructorController.requestReschedule));

export default router;
