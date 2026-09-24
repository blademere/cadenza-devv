import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './professional.service.js'
import * as controller from './professional.controller.js'
import * as validation from './professional.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-professionals', required: true })
const loadProfessional = (id, req) => service.getForAuthorization(id, getApplicationId(req))

router.get('/', authenticate, authorize('obo_professionals', 'read'), validate(validation.professionalLookupValidator), asyncHandler(controller.listDirectory))
router.get('/profile', authenticate, authorize('obo_professionals', 'read'), asyncHandler(controller.getProfile))
router.post('/profile', authenticate, authorize('obo_professionals', 'create'), requireIdempotency, validate(validation.profileValidator), asyncHandler(controller.createProfile))
router.patch('/profile', authenticate, authorize('obo_professionals', 'update'), requireIdempotency, validate(validation.profileUpdateValidator), asyncHandler(controller.updateProfile))
router.post('/applications', authenticate, authorize('obo_professionals', 'create'), requireIdempotency, validate(validation.applyValidator), asyncHandler(controller.apply))
router.get('/applications/mine', authenticate, authorize('obo_professionals', 'read'), asyncHandler(controller.getMine))
router.get('/applications/pending', authenticate, authorize('obo_professionals', 'review'), asyncHandler(controller.listPending))
router.get('/applications/verified', authenticate, authorize('obo_professionals', 'read'), asyncHandler(controller.listVerified))
router.post('/applications/:id/decision', authenticate, authorizeResource({ resource: 'obo_professionals', action: 'review', loadResource: loadProfessional, getResourceId: (req) => req.params.id }), requireIdempotency, validate(validation.decisionValidator), asyncHandler(controller.decide))

export default router
