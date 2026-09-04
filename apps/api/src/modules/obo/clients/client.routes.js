import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize from '../../../platform/authorization/authorize.js'
import * as controller from './client.controller.js'
import * as validation from './client.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-clients', required: true })

router.post('/me', authenticate, authorize('obo_clients', 'create'), requireIdempotency, validate(validation.registrationValidator), asyncHandler(controller.createMine))
router.get('/me', authenticate, authorize('obo_clients', 'read'), asyncHandler(controller.getMine))

export default router
