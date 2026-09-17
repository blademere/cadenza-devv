import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import { authorizeOBO, authorizeOBOResource } from '../authorization/authorization.service.js'
import * as controller from './plan-permit.controller.js'
import * as service from './plan-permit.service.js'
import * as validation from './plan-permit.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-plan-permits', required: true })
const loadApplication = (id, req) => service.getForAuthorization(id, req.security.app.id)
const authorizeApplicationRead = authorizeOBOResource({ resource: 'obo_plan_permits', action: 'read', loadResource: loadApplication, getResourceId: (req) => req.params.id })
const authorizeApplicationUpdate = authorizeOBOResource({ resource: 'obo_plan_permits', action: 'update', loadResource: loadApplication, getResourceId: (req) => req.params.id })
const authorizeApplicationSubmit = authorizeOBOResource({ resource: 'obo_plan_permits', action: 'submit', loadResource: loadApplication, getResourceId: (req) => req.params.id })

router.post('/', authenticate, authorizeOBO('obo_plan_permits', 'create'), requireIdempotency, validate(validation.createApplicationValidator), asyncHandler(controller.create))
router.get('/mine', authenticate, authorizeOBO('obo_plan_permits', 'read'), asyncHandler(controller.list))
router.get('/:id', authenticate, authorizeApplicationRead, validate(validation.applicationParamsValidator), asyncHandler(controller.get))
router.patch('/:id', authenticate, authorizeApplicationUpdate, requireIdempotency, validate(validation.updateApplicationValidator), asyncHandler(controller.update))
router.post('/:id/submit', authenticate, authorizeApplicationSubmit, requireIdempotency, validate(validation.applicationParamsValidator), asyncHandler(controller.submit))

export default router
