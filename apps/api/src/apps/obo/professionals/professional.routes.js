import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import { authorizeOBO, authorizeOBOResource } from '../authorization/authorization.service.js'
import * as service from './professional.service.js'
import * as controller from './professional.controller.js'
import * as validation from './professional.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-professionals', required: true })
const loadProfessional = (id, req) => service.getForAuthorization(id, req.security.app.id)

router.get('/', authenticate, authorizeOBO('obo_professionals', 'read'), validate(validation.professionalLookupValidator), asyncHandler(controller.listDirectory))
router.get('/profile', authenticate, authorizeOBO('obo_professionals', 'read'), asyncHandler(controller.getProfile))
router.post('/profile', authenticate, authorizeOBO('obo_professionals', 'create'), requireIdempotency, validate(validation.profileValidator), asyncHandler(controller.createProfile))
router.patch('/profile', authenticate, authorizeOBO('obo_professionals', 'update'), requireIdempotency, validate(validation.profileUpdateValidator), asyncHandler(controller.updateProfile))
router.post('/applications', authenticate, authorizeOBO('obo_professionals', 'create'), requireIdempotency, validate(validation.applyValidator), asyncHandler(controller.apply))
router.get('/applications/mine', authenticate, authorizeOBO('obo_professionals', 'read'), asyncHandler(controller.getMine))
router.get('/applications/pending', authenticate, authorizeOBO('obo_professionals', 'review'), asyncHandler(controller.listPending))
router.get('/applications/verified', authenticate, authorizeOBO('obo_professionals', 'read'), asyncHandler(controller.listVerified))
router.post('/applications/:id/decision', authenticate, authorizeOBOResource({ resource: 'obo_professionals', action: 'review', loadResource: loadProfessional, getResourceId: (req) => req.params.id }), requireIdempotency, validate(validation.decisionValidator), asyncHandler(controller.decide))

export default router
