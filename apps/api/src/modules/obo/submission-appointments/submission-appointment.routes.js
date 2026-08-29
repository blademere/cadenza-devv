const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../../common/middleware')
const authenticate = require('../../../features/auth/authenticate.secure')
const authorize = require('../../../platform/authorization/authorize')
const controller = require('./submission-appointment.controller')
const validation = require('./submission-appointment.validation')

const router = express.Router({ mergeParams: true })
const requireIdempotency = idempotency({ scope: 'obo-submission-appointments', required: true })

router.post(
  '/',
  authenticate,
  authorize('obo_plan_permits', 'schedule_submission'),
  requireIdempotency,
  validate(validation.createSubmissionAppointmentValidator),
  asyncHandler(controller.create),
)

router.get(
  '/',
  authenticate,
  authorize('obo_plan_permits', 'read'),
  validate(validation.applicationParamsValidator),
  asyncHandler(controller.get),
)

module.exports = router
