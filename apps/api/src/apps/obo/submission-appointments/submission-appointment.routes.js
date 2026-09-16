import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import { authorizeOBO } from '../authorization/authorization.service.js'
import * as controller from './submission-appointment.controller.js'
import * as validation from './submission-appointment.validation.js'

const router = express.Router({ mergeParams: true })
const requireIdempotency = idempotency({ scope: 'obo-submission-appointments', required: true })
router.post('/', authenticate, authorizeOBO('obo_plan_permits', 'schedule_submission'), requireIdempotency, validate(validation.createSubmissionAppointmentValidator), asyncHandler(controller.create))
router.get('/', authenticate, authorizeOBO('obo_plan_permits', 'read'), validate(validation.applicationParamsValidator), asyncHandler(controller.get))
router.post('/reschedule', authenticate, authorizeOBO('obo_plan_permits', 'schedule_submission'), requireIdempotency, validate(validation.replaceSubmissionAppointmentValidator), asyncHandler(controller.replace))

export default router
