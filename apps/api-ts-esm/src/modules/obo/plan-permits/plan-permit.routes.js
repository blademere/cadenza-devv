const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../../common/middleware')
const authenticate = require('../../../features/auth/authenticate.secure')
const authorize = require('../../../platform/authorization/authorize')
const controller = require('./plan-permit.controller')
const validation = require('./plan-permit.validation')

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-plan-permits', required: true })

router.post('/', authenticate, authorize('obo_plan_permits', 'create'), requireIdempotency, validate(validation.createApplicationValidator), asyncHandler(controller.create))
router.get('/mine', authenticate, authorize('obo_plan_permits', 'read'), asyncHandler(controller.list))
router.get('/:id', authenticate, authorize('obo_plan_permits', 'read'), validate(validation.applicationParamsValidator), asyncHandler(controller.get))
router.patch('/:id', authenticate, authorize('obo_plan_permits', 'update'), requireIdempotency, validate(validation.updateApplicationValidator), asyncHandler(controller.update))
router.post('/:id/submit', authenticate, authorize('obo_plan_permits', 'submit'), requireIdempotency, validate(validation.applicationParamsValidator), asyncHandler(controller.submit))

module.exports = router
