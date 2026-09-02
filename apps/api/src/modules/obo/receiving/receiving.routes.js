import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize from '../../../platform/authorization/authorize.js'
import authorizeResource from '../../../platform/authorization/authorizeResource.js'
import * as repository from './receiving.repository.js'
import * as controller from './receiving.controller.js'
import * as validation from './receiving.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-receiving', required: true })
const resource = (action) => authorizeResource({ resource: 'obo_plan_permits', action, loadResource: repository.findApplication, getResourceId: (req) => req.params.id })

router.get('/applications', authenticate, authorize('obo_plan_permits', 'receive'), validate(validation.listValidator), asyncHandler(controller.list))
router.post('/applications/:id/receive', authenticate, resource('receive'), requireIdempotency, validate(validation.applicationParamsValidator), asyncHandler(controller.receive))
router.post('/applications/:id/decision', authenticate, resource('receive'), requireIdempotency, validate(validation.decisionValidator), asyncHandler(controller.decide))

export default router
