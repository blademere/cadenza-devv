import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import { requireApplicationContext } from '../../../platform/applications/application-context.middleware.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import { getModule, getMembership, getRole } from './authorization-management.service.js'
import {
  listModulesController, createModuleController, createPermissionController, setModuleActiveController,
  listRolesController, createRoleController, getRoleController, replaceRolePermissionsController,
  listMembershipRolesController, replaceMembershipRolesController,
} from './authorization.controller.js'
import {
  createModuleValidator, createPermissionValidator, setModuleActiveValidator, createRoleValidator,
  roleParamsValidator, replaceRolePermissionsValidator, membershipParamsValidator, membershipRolesValidator,
} from './authorization.validation.js'

const router = express.Router()
const manageAuthorization = authorize('obo_authorization', 'manage')
const requireIdempotency = idempotency({ scope: 'obo-authorization', required: true })
const authorizeModuleResource = authorizeResource({
  resource: 'obo_authorization',
  action: 'manage',
  loadResource: getModule,
  getResourceId: (req) => Number(req.params.moduleId),
})
const authorizeRoleResource = authorizeResource({
  resource: 'obo_authorization',
  action: 'manage',
  loadResource: (roleId, req) => getRole({ roleId, appId: req.security.app.id }),
  getResourceId: (req) => Number(req.params.roleId),
})
const authorizeMembershipResource = authorizeResource({
  resource: 'obo_authorization',
  action: 'manage',
  loadResource: (membershipId, req) => getMembership({ membershipId, appId: req.security.app.id }),
  getResourceId: (req) => req.params.membershipId,
})

router.use(authenticate, requireApplicationContext(), manageAuthorization)
router.get('/modules', asyncHandler(listModulesController))
router.post('/modules', requireIdempotency, validate(createModuleValidator), asyncHandler(createModuleController))
router.post('/modules/:moduleId/permissions', authorizeModuleResource, requireIdempotency, validate(createPermissionValidator), asyncHandler(createPermissionController))
router.patch('/modules/:moduleId/active', authorizeModuleResource, requireIdempotency, validate(setModuleActiveValidator), asyncHandler(setModuleActiveController))
router.get('/roles', asyncHandler(listRolesController))
router.post('/roles', requireIdempotency, validate(createRoleValidator), asyncHandler(createRoleController))
router.get('/roles/:roleId', authorizeRoleResource, validate(roleParamsValidator), asyncHandler(getRoleController))
router.put('/roles/:roleId/permissions', authorizeRoleResource, requireIdempotency, validate(replaceRolePermissionsValidator), asyncHandler(replaceRolePermissionsController))
router.get('/memberships/:membershipId/roles', authorizeMembershipResource, validate(membershipParamsValidator), asyncHandler(listMembershipRolesController))
router.put('/memberships/:membershipId/roles', authorizeMembershipResource, requireIdempotency, validate(membershipRolesValidator), asyncHandler(replaceMembershipRolesController))

export default router
