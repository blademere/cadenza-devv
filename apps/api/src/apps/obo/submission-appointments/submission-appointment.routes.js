import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './submission-appointment.controller.js'
import * as validation from './submission-appointment.validation.js'

const router = express.Router({ mergeParams: true })
const requireIdempotency = idempotency({ scope: 'obo-submission-appointments', required: true })
router.post('/', authenticate, authorize('obo_applications', 'schedule_submission'), requireIdempotency, validate(validation.createSubmissionAppointmentValidator), asyncHandler(controller.create))
router.get('/', authenticate, authorize('obo_applications', 'read'), validate(validation.applicationParamsValidator), asyncHandler(controller.get))
router.post('/reschedule', authenticate, authorize('obo_applications', 'schedule_submission'), requireIdempotency, validate(validation.replaceSubmissionAppointmentValidator), asyncHandler(controller.replace))

export default router
