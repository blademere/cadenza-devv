import express from 'express'
import { asyncHandler } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize from '../../../platform/authorization/authorize.js'
import * as controller from './permit-type.controller.js'

const router = express.Router()
router.get('/', authenticate, authorize('obo_plan_permits', 'read'), asyncHandler(controller.list))
router.get('/:permitTypeId/form', authenticate, authorize('obo_plan_permits', 'read'), asyncHandler(controller.getForm))

export default router
