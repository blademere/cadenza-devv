import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './lesson.controller.js'
import {packageValidator,enrollmentValidator,sessionValidator,attendanceValidator,rescheduleValidator,reviewRescheduleValidator,attachmentValidator} from './lesson.validation.js'
const router=express.Router()
router.get('/packages',authorize('cadenza_lessons','read'),asyncHandler(controller.listPackages))
router.post('/packages',authorize('cadenza_lessons','create'),idempotency({scope:'cadenza-lesson-packages',required:true}),validate(packageValidator),asyncHandler(controller.createPackage))
router.post('/packages/:lessonPackageId/attachments',authorize('cadenza_lessons','create'),idempotency({scope:'cadenza-lesson-attachments',required:true}),validate(attachmentValidator),asyncHandler(controller.addAttachment))
router.get('/packages/:lessonPackageId/attachments',authorize('cadenza_lessons','read'),asyncHandler(controller.listAttachments))
router.delete('/packages/:lessonPackageId/attachments/:id',authorize('cadenza_lessons','manage'),idempotency({scope:'cadenza-lesson-attachment-delete',required:true}),asyncHandler(controller.removeAttachment))
router.get('/enrollments',authorize('cadenza_enrollments','read'),asyncHandler(controller.listEnrollments))
router.post('/enrollments',authorize('cadenza_enrollments','create'),idempotency({scope:'cadenza-enrollments',required:true}),validate(enrollmentValidator),asyncHandler(controller.enroll))
router.get('/sessions',authorize('cadenza_lessons','read'),asyncHandler(controller.listSessions))
router.post('/sessions',authorize('cadenza_lessons','create'),idempotency({scope:'cadenza-lesson-sessions',required:true}),validate(sessionValidator),asyncHandler(controller.createSession))
router.post('/sessions/:sessionId/attendance',authorize('cadenza_lessons','update'),idempotency({scope:'cadenza-attendance',required:true}),validate(attendanceValidator),asyncHandler(controller.markAttendance))
router.post('/reschedules',authorize('cadenza_lessons','create'),idempotency({scope:'cadenza-reschedules',required:true}),validate(rescheduleValidator),asyncHandler(controller.requestReschedule))
router.post('/reschedules/:id/review',authorize('cadenza_lessons','manage'),idempotency({scope:'cadenza-reschedule-review',required:true}),validate(reviewRescheduleValidator),asyncHandler(controller.reviewReschedule))
export default router
