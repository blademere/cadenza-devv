import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './lesson.controller.js'
import {packageValidator,enrollmentValidator,sessionValidator} from './lesson.validation.js'
const router=express.Router();router.use(authorize('cadenza_lessons','manage'));router.get('/packages',asyncHandler(controller.listPackages));router.post('/packages',idempotency({scope:'cadenza-lesson-packages',required:true}),validate(packageValidator),asyncHandler(controller.createPackage));router.get('/enrollments',asyncHandler(controller.listEnrollments));router.post('/enrollments',idempotency({scope:'cadenza-enrollments',required:true}),validate(enrollmentValidator),asyncHandler(controller.enroll));router.get('/sessions',asyncHandler(controller.listSessions));router.post('/sessions',idempotency({scope:'cadenza-lesson-sessions',required:true}),validate(sessionValidator),asyncHandler(controller.createSession));export default router
