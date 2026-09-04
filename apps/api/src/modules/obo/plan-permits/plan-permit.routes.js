import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize from '../../../platform/authorization/authorize.js'
import * as controller from './plan-permit.controller.js'
import * as validation from './plan-permit.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-plan-permits', required: true })

router.post('/', authenticate, authorize('obo_plan_permits', 'create'), requireIdempotency, validate(validation.createApplicationValidator), asyncHandler(controller.create))
router.get('/mine', authenticate, authorize('obo_plan_permits', 'read'), asyncHandler(controller.list))
router.get('/:id', authenticate, authorize('obo_plan_permits', 'read'), validate(validation.applicationParamsValidator), asyncHandler(controller.get))
router.patch('/:id', authenticate, authorize('obo_plan_permits', 'update'), requireIdempotency, validate(validation.updateApplicationValidator), asyncHandler(controller.update))
router.post('/:id/submit', authenticate, authorize('obo_plan_permits', 'submit'), requireIdempotency, validate(validation.applicationParamsValidator), asyncHandler(controller.submit))

export default router
