const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../../common/middleware')
const authenticate = require('../../../features/auth/authenticate.secure')
const authorize = require('../../../platform/authorization/authorize')
const authorizeResource = require('../../../platform/authorization/authorizeResource')
const repository = require('./professional.repository')
const controller = require('./professional.controller')
const validation = require('./professional.validation')

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-professionals', required: true })

router.post('/', authenticate, authorize('obo_professionals', 'create'), requireIdempotency, validate(validation.applyValidator), asyncHandler(controller.apply))
router.get('/pending', authenticate, authorize('obo_professionals', 'review'), asyncHandler(controller.listPending))
router.post('/:id/verification', authenticate, authorizeResource({
  resource: 'obo_professionals',
  action: 'review',
  loadResource: repository.findById,
  getResourceId: (req) => req.params.id,
}), requireIdempotency, validate(validation.decisionValidator), asyncHandler(controller.decide))

module.exports = router
