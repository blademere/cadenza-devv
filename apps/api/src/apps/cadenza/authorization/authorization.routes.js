import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import { getModule, getRole, getMembership } from './authorization-management.service.js'
import * as controller from './authorization.controller.js'
import * as validation from './authorization.validation.js'

const router = express.Router()
const manage = authorize('cadenza_authorization', 'manage')
const idem = idempotency({ scope: 'cadenza-authorization', required: true })
const moduleResource = authorizeResource({ resource: 'cadenza_authorization', action: 'manage', loadResource: getModule, getResourceId: (req) => Number(req.params.moduleId) })
const roleResource = authorizeResource({ resource: 'cadenza_authorization', action: 'manage', loadResource: (roleId, req) => getRole({ roleId, appId: req.security.app.id }), getResourceId: (req) => Number(req.params.roleId) })
const membershipResource = authorizeResource({ resource: 'cadenza_authorization', action: 'manage', loadResource: (membershipId, req) => getMembership({ membershipId, appId: req.security.app.id }), getResourceId: (req) => req.params.membershipId })
router.use(manage)
router.get('/modules', asyncHandler(controller.listModulesController))
router.post('/modules', idem, validate(validation.createModuleValidator), asyncHandler(controller.createModuleController))
router.post('/modules/:moduleId/permissions', moduleResource, idem, validate(validation.createPermissionValidator), asyncHandler(controller.createPermissionController))
router.patch('/modules/:moduleId/active', moduleResource, idem, validate(validation.setModuleActiveValidator), asyncHandler(controller.setModuleActiveController))
router.get('/roles', asyncHandler(controller.listRolesController))
router.post('/roles', idem, validate(validation.createRoleValidator), asyncHandler(controller.createRoleController))
router.get('/roles/:roleId', roleResource, validate(validation.roleParamsValidator), asyncHandler(controller.getRoleController))
router.put('/roles/:roleId/permissions', roleResource, idem, validate(validation.replaceRolePermissionsValidator), asyncHandler(controller.replaceRolePermissionsController))
router.get('/memberships/:membershipId/roles', membershipResource, validate(validation.membershipParamsValidator), asyncHandler(controller.listMembershipRolesController))
router.put('/memberships/:membershipId/roles', membershipResource, idem, validate(validation.membershipRolesValidator), asyncHandler(controller.replaceMembershipRolesController))
export default router
