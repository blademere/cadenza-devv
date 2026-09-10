import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize from '../../../platform/authorization/authorize.js'
import authorizeResource from '../../../platform/authorization/authorization-resource.middleware.js'
import * as service from './receiving.service.js'
import * as controller from './receiving.controller.js'
import * as validation from './receiving.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-receiving', required: true })
const loadApplication = (id) => service.getForAuthorization(id)

router.get('/applications', authenticate, authorize('obo_plan_permits', 'receive'), validate(validation.listValidator), asyncHandler(controller.list))
router.get('/applications/:id', authenticate, authorizeResource({ resource: 'obo_plan_permits', action: 'receive', loadResource: loadApplication, getResourceId: (req) => req.params.id }), validate(validation.applicationParamsValidator), asyncHandler(controller.get))
router.post('/applications/:id/receive', authenticate, authorizeResource({ resource: 'obo_plan_permits', action: 'receive', loadResource: loadApplication, getResourceId: (req) => req.params.id }), requireIdempotency, validate(validation.applicationParamsValidator), asyncHandler(controller.receive))
router.post('/applications/:id/decision', authenticate, authorizeResource({ resource: 'obo_plan_permits', action: 'receive', loadResource: loadApplication, getResourceId: (req) => req.params.id }), requireIdempotency, validate(validation.decisionValidator), asyncHandler(controller.decide))

export default router
