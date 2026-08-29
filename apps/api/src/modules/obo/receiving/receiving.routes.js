const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../../common/middleware')
const authenticate = require('../../../features/auth/authenticate.secure')
const authorize = require('../../../platform/authorization/authorize')
const authorizeResource = require('../../../platform/authorization/authorizeResource')
const repository = require('./receiving.repository')
const controller = require('./receiving.controller')
const validation = require('./receiving.validation')

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-receiving', required: true })
const resource = (action) => authorizeResource({
  resource: 'obo_plan_permits',
  action,
  loadResource: repository.findApplication,
  getResourceId: (req) => req.params.id,
})

router.get('/applications', authenticate, authorize('obo_plan_permits', 'receive'), validate(validation.listValidator), asyncHandler(controller.list))
router.post('/applications/:id/receive', authenticate, resource('receive'), requireIdempotency, validate(validation.applicationParamsValidator), asyncHandler(controller.receive))
router.post('/applications/:id/decision', authenticate, resource('receive'), requireIdempotency, validate(validation.decisionValidator), asyncHandler(controller.decide))

module.exports = router
