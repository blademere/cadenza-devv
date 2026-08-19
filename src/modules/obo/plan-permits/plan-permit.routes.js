const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../../common/middleware')
const authenticate = require('../../../features/auth/authenticate.secure')
const authorize = require('../../../platform/authorization/authorize')
const authorizeResource = require('../../../platform/authorization/authorizeResource')
const repository = require('./plan-permit.repository')
const controller = require('./plan-permit.controller')
const validation = require('./plan-permit.validation')

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-plan-permits', required: true })
const applicationResource = (action) => authorizeResource({
  resource: 'obo_plan_permits',
  action,
  loadResource: repository.findById,
  getResourceId: (req) => req.params.id,
})

router.post('/', authenticate, authorize('obo_plan_permits', 'create'), requireIdempotency, validate(validation.createApplicationValidator), asyncHandler(controller.create))
router.get('/mine', authenticate, authorize('obo_plan_permits', 'read'), asyncHandler(controller.list))
router.get('/:id', authenticate, applicationResource('read'), validate(validation.applicationParamsValidator), asyncHandler(controller.get))
router.patch('/:id', authenticate, applicationResource('update'), requireIdempotency, validate(validation.updateApplicationValidator), asyncHandler(controller.update))
router.post('/:id/submit', authenticate, applicationResource('create'), requireIdempotency, validate(validation.applicationParamsValidator), asyncHandler(controller.submit))
router.post('/:id/submission-appointment', authenticate, applicationResource('create'), requireIdempotency, validate(validation.submissionAppointmentValidator), asyncHandler(controller.bookAppointment))

module.exports = router
