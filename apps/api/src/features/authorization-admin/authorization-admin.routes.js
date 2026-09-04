import express from 'express'
import { asyncHandler, validate, idempotency, cache } from '../../common/middleware/index.js'
import authenticate from '../auth/authenticate.secure.js'
import authorize from '../../platform/authorization/authorize.js'
import authorizeResource from '../../platform/authorization/authorization-resource.middleware.js'
import repository from './authorization-admin.repository.js'
import {
  listModulesController,
  createModuleController,
  createPermissionController,
  setModuleActiveController,
  listRolesController,
  replaceRolePermissionsController,
} from './authorization-admin.controller.js'
import {
  AUTHORIZATION_MODULES_CACHE_KEY,
  AUTHORIZATION_ROLES_CACHE_KEY,
} from './authorization-admin.service.js'
import {
  createModuleValidator,
  createPermissionValidator,
  setModuleActiveValidator,
  replaceRolePermissionsValidator,
} from './authorization-admin.validation.js'

const router = express.Router()
const manageAuthorization = authorize('authorization', 'manage')
const requireIdempotency = idempotency({ scope: 'authorization-admin', required: true })
const authorizeModuleResource = authorizeResource({
  resource: 'authorization',
  action: 'manage',
  loadResource: repository.findModuleById,
  getResourceId: (req) => Number(req.params.moduleId),
})
const authorizeRoleResource = authorizeResource({
  resource: 'authorization',
  action: 'manage',
  loadResource: repository.findRoleById,
  getResourceId: (req) => Number(req.params.roleId),
})

router.get(
  '/modules',
  authenticate,
  manageAuthorization,
  cache({ key: () => AUTHORIZATION_MODULES_CACHE_KEY, ttlSeconds: 300 }),
  asyncHandler(listModulesController)
)
router.post('/modules', authenticate, manageAuthorization, requireIdempotency, validate(createModuleValidator), asyncHandler(createModuleController))
router.post('/modules/:moduleId/permissions', authenticate, authorizeModuleResource, requireIdempotency, validate(createPermissionValidator), asyncHandler(createPermissionController))
router.patch('/modules/:moduleId/active', authenticate, authorizeModuleResource, requireIdempotency, validate(setModuleActiveValidator), asyncHandler(setModuleActiveController))
router.get(
  '/roles',
  authenticate,
  manageAuthorization,
  cache({ key: () => AUTHORIZATION_ROLES_CACHE_KEY, ttlSeconds: 300 }),
  asyncHandler(listRolesController)
)
router.put('/roles/:roleId/permissions', authenticate, authorizeRoleResource, requireIdempotency, validate(replaceRolePermissionsValidator), asyncHandler(replaceRolePermissionsController))

export default router
