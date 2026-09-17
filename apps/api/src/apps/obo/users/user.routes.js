import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import { authorizeOBO } from '../authorization/authorization.service.js'
import {
  listUsersValidator,
  createUserValidator,
} from '../../../features/users/user.validation.js'
import { assignUserRoleValidator } from './user.validation.js'
import * as controller from './user.controller.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-users', required: true })

router.get('/', authorizeOBO('obo_users', 'read'), validate(listUsersValidator), asyncHandler(controller.listUsers))
router.post('/', authorizeOBO('obo_users', 'create'), requireIdempotency, validate(createUserValidator), asyncHandler(controller.createUser))
router.post('/:userId/roles', authorizeOBO('obo_users', 'manage'), requireIdempotency, validate(assignUserRoleValidator), asyncHandler(controller.assignUserRole))

export default router
