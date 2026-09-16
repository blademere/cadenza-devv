import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import { authorizeOBO } from '../authorization/authorization.service.js'
import * as controller from './client.controller.js'
import * as validation from './client.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-clients', required: true })

router.post('/profile', authenticate, authorizeOBO('obo_clients', 'create'), requireIdempotency, validate(validation.registrationValidator), asyncHandler(controller.createProfile))
router.get('/profile', authenticate, authorizeOBO('obo_clients', 'read'), asyncHandler(controller.getProfile))
router.patch('/profile', authenticate, authorizeOBO('obo_clients', 'update'), requireIdempotency, validate(validation.profileUpdateValidator), asyncHandler(controller.updateProfile))

export default router
