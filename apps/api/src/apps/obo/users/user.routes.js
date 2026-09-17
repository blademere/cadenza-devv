import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import { getUserMembership } from '../../../platform/applications/application.service.js'
import {
  listUsersValidator,
  createUserValidator,
  assignUserRoleValidator,
} from './user.validation.js'
import * as controller from './user.controller.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-users', required: true })

const loadOBOUserMembership = async (userId, req) => getUserMembership({
  userId,
  appId: req.auth?.appId ?? req.appContext?.id ?? req.security?.app?.id,
})

const authorizeOBOUserRoleManagement = authorizeResource({
  resource: 'obo_users',
  action: 'manage',
  loadResource: loadOBOUserMembership,
  getResourceId: (req) => req.params.userId,
})

router.get('/', authorize('obo_users', 'read'), validate(listUsersValidator), asyncHandler(controller.listUsers))
router.post('/', authorize('obo_users', 'create'), requireIdempotency, validate(createUserValidator), asyncHandler(controller.createUser))
router.post('/:userId/roles', authorizeOBOUserRoleManagement, requireIdempotency, validate(assignUserRoleValidator), asyncHandler(controller.assignUserRole))

export default router
