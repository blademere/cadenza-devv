import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, idempotency, validate } from '../../../../common/middleware/index.js';
import requireInstructor from '../../middleware/require-instructor.js';
import { instructorController } from './instructor.controller.js';

const router = Router();
const attendanceValidator = async (req) => z.object({
  body: z.object({
    sessionId: z.uuid(),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'NO_SHOW', 'COMPLETED', 'ATTENDED']),
    notes: z.string().max(2000).optional().default(''),
  }),
}).parse({ body: req.body || {} });
const rescheduleValidator = async (req) => z.object({
  params: z.object({ sessionId: z.uuid() }),
  body: z.object({ requestedStart: z.coerce.date(), reason: z.string().trim().min(3).max(500) }),
}).parse({ params: req.params || {}, body: req.body || {} });
const feedbackValidator = async (req) => z.object({
  body: z.object({ sessionId: z.uuid(), notes: z.string().max(2000) }),
}).parse({ body: req.body || {} });
const choiceValidator = async (req) => z.object({
  params: z.object({ sessionId: z.uuid() }),
  body: z.object({ optionIds: z.array(z.string().min(1)).min(1) }),
}).parse({ params: req.params || {}, body: req.body || {} });
const profileValidator = async (req) => z.object({ body: z.object({ firstName: z.string().min(1), middleName: z.string().optional().default(''), lastName: z.string().min(1), phone: z.string().max(40).optional().default('') }) }).parse({ body: req.body || {} });
const passwordValidator = async (req) => z.object({ body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }) }).parse({ body: req.body || {} });

router.use(requireInstructor);
router.get('/dashboard', asyncHandler(instructorController.dashboard));
router.get('/schedule', asyncHandler(instructorController.schedule));
router.get('/progress', asyncHandler(instructorController.progress));
router.get('/attendance', asyncHandler(instructorController.attendance));
router.post('/attendance', validate(attendanceValidator), idempotency({ scope: 'cadenza-mobile-instructor-attendance', required: true }), asyncHandler(instructorController.recordAttendance));
router.post('/feedback', validate(feedbackValidator), idempotency({ scope: 'cadenza-mobile-instructor-feedback', required: true }), asyncHandler(instructorController.saveFeedback));
router.post('/schedule/:sessionId/choice', validate(choiceValidator), idempotency({ scope: 'cadenza-mobile-instructor-schedule-choice', required: true }), asyncHandler(instructorController.chooseSchedule));
router.patch('/profile', validate(profileValidator), asyncHandler(instructorController.updateProfile));
router.post('/password', validate(passwordValidator), idempotency({ scope: 'cadenza-mobile-instructor-password', required: true }), asyncHandler(instructorController.resetPassword));
router.post('/schedule/:sessionId/request', validate(rescheduleValidator), idempotency({ scope: 'cadenza-mobile-instructor-reschedule', required: true }), asyncHandler(instructorController.requestReschedule));

export default router;
