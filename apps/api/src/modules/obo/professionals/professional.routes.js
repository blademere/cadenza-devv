import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize from '../../../platform/authorization/authorize.js'
import authorizeResource from '../../../platform/authorization/authorization-resource.middleware.js'
import * as repository from './professional.repository.js'
import * as controller from './professional.controller.js'
import * as validation from './professional.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-professionals', required: true })

router.get('/profile', authenticate, authorize('obo_professionals', 'read'), asyncHandler(controller.getProfile))
router.put('/profile', authenticate, authorize('obo_professionals', 'update'), requireIdempotency, validate(validation.profileValidator), asyncHandler(controller.updateProfile))
router.post('/', authenticate, authorize('obo_professionals', 'create'), requireIdempotency, validate(validation.applyValidator), asyncHandler(controller.apply))
router.get('/mine', authenticate, authorize('obo_professionals', 'read'), asyncHandler(controller.getMine))
router.get('/verified', authenticate, authorize('obo_professionals', 'read'), asyncHandler(controller.listVerified))
router.get('/pending', authenticate, authorize('obo_professionals', 'review'), asyncHandler(controller.listPending))
router.post('/:id/verification', authenticate, authorizeResource({ resource: 'obo_professionals', action: 'review', loadResource: repository.findById, getResourceId: (req) => req.params.id }), requireIdempotency, validate(validation.decisionValidator), asyncHandler(controller.decide))

export default router
