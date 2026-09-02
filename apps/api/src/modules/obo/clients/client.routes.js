const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../../common/middleware')
const authenticate = require('../../../features/auth/authenticate.secure')
const authorize = require('../../../platform/authorization/authorize')
const controller = require('./client.controller')
const validation = require('./client.validation')

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-clients', required: true })

router.post('/me', authenticate, authorize('obo_clients', 'create'), requireIdempotency, validate(validation.registrationValidator), asyncHandler(controller.createMine))
router.get('/me', authenticate, authorize('obo_clients', 'read'), asyncHandler(controller.getMine))

module.exports = router
