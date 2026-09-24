import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './lesson.controller.js'
import * as service from './lesson.service.js'
import {packageValidator,packageUpdateValidator,enrollmentValidator,sessionValidator,attendanceValidator,rescheduleValidator,reviewRescheduleValidator,attachmentValidator} from './lesson.validation.js'
const router=express.Router()
const packageResource=(action)=>authorizeResource({resource:'cadenza_lessons',action,loadResource:(id,req)=>service.getPackage({appId:req.security.app.id,id}),getResourceId:req=>req.params.lessonPackageId})
const enrollmentResource=authorizeResource({resource:'cadenza_enrollments',action:'read',loadResource:(id,req)=>service.getEnrollment({appId:req.security.app.id,id,actorId:req.user?.id}),getResourceId:req=>req.params.enrollmentId})
router.get('/packages',authorize('cadenza_lessons','read'),asyncHandler(controller.listPackages))
router.post('/packages',authorize('cadenza_lessons','create'),idempotency({scope:'cadenza-lesson-packages',required:true}),validate(packageValidator),asyncHandler(controller.createPackage))
router.patch('/packages/:lessonPackageId',packageResource('update'),idempotency({scope:'cadenza-lesson-package-update',required:true}),validate(packageUpdateValidator),asyncHandler(controller.updatePackage))
router.post('/packages/:lessonPackageId/attachments',packageResource('create'),idempotency({scope:'cadenza-lesson-attachments',required:true}),validate(attachmentValidator),asyncHandler(controller.addAttachment))
router.get('/packages/:lessonPackageId/attachments',packageResource('read'),asyncHandler(controller.listAttachments))
router.get('/packages/:lessonPackageId/attachments/:id/url',packageResource('read'),asyncHandler(controller.getAttachmentUrl))
router.delete('/packages/:lessonPackageId/attachments/:id',packageResource('manage'),idempotency({scope:'cadenza-lesson-attachment-delete',required:true}),asyncHandler(controller.removeAttachment))
router.get('/enrollments',authorize('cadenza_enrollments','read'),asyncHandler(controller.listEnrollments))
router.get('/enrollments/:enrollmentId',enrollmentResource,asyncHandler(controller.getEnrollment))
router.post('/enrollments/:enrollmentId/cancel',authorizeResource({resource:'cadenza_enrollments',action:'cancel',loadResource:(id,req)=>service.getEnrollment({appId:req.security.app.id,id,actorId:req.user?.id}),getResourceId:req=>req.params.enrollmentId}),idempotency({scope:'cadenza-enrollment-cancel',required:true}),asyncHandler(controller.cancelEnrollment))
router.post('/enrollments',authorize('cadenza_enrollments','create'),idempotency({scope:'cadenza-enrollments',required:true}),validate(enrollmentValidator),asyncHandler(controller.enroll))
router.get('/sessions',authorize('cadenza_lessons','read'),asyncHandler(controller.listSessions))
router.post('/sessions',authorize('cadenza_lessons','schedule'),idempotency({scope:'cadenza-lesson-sessions',required:true}),validate(sessionValidator),asyncHandler(controller.createSession))
router.post('/sessions/:sessionId/attendance',authorizeResource({resource:'cadenza_lessons',action:'attendance',loadResource:(id,req)=>service.getSession({appId:req.security.app.id,id}),getResourceId:(req)=>req.params.sessionId}),idempotency({scope:'cadenza-attendance',required:true}),validate(attendanceValidator),asyncHandler(controller.markAttendance))
router.post('/sessions/:sessionId/complete',authorizeResource({resource:'cadenza_lessons',action:'complete',loadResource:(id,req)=>service.getSession({appId:req.security.app.id,id}),getResourceId:(req)=>req.params.sessionId}),idempotency({scope:'cadenza-session-complete',required:true}),asyncHandler(controller.completeSession))
router.post('/sessions/:sessionId/cancel',authorizeResource({resource:'cadenza_lessons',action:'cancel',loadResource:(id,req)=>service.getSession({appId:req.security.app.id,id}),getResourceId:(req)=>req.params.sessionId}),idempotency({scope:'cadenza-session-cancel',required:true}),asyncHandler(controller.cancelSession))
router.get('/reschedules',authorize('cadenza_lessons','read'),asyncHandler(controller.listReschedules))
router.post('/reschedules',authorize('cadenza_lessons','request_reschedule'),idempotency({scope:'cadenza-reschedules',required:true}),validate(rescheduleValidator),asyncHandler(controller.requestReschedule))
router.post('/reschedules/:id/cancel',authorizeResource({resource:'cadenza_lessons',action:'request_reschedule',loadResource:(id,req)=>service.getReschedule({appId:req.security.app.id,id}),getResourceId:req=>req.params.id}),idempotency({scope:'cadenza-reschedule-cancel',required:true}),asyncHandler(controller.cancelReschedule))
const rescheduleResource = authorizeResource({resource:'cadenza_lessons',action:'review_reschedule',loadResource:(id,req)=>service.getReschedule({appId:req.security.app.id,id}),getResourceId:(req)=>req.params.id})
router.post('/reschedules/:id/review',rescheduleResource,idempotency({scope:'cadenza-reschedule-review',required:true}),validate(reviewRescheduleValidator),asyncHandler(controller.reviewReschedule))
export default router
