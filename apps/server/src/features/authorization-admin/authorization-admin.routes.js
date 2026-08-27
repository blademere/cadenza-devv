const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../common/middleware')
const authenticate = require('../auth/authenticate.secure')
const authorize = require('../../platform/authorization/authorize')
const authorizeResource = require('../../platform/authorization/authorizeResource')
const repository = require('./authorization-admin.repository')
const {
  listModulesController,
  createModuleController,
  createPermissionController,
  setModuleActiveController,
  listRolesController,
  replaceRolePermissionsController,
} = require('./authorization-admin.controller')
const {
  createModuleValidator,
  createPermissionValidator,
  setModuleActiveValidator,
  replaceRolePermissionsValidator,
} = require('./authorization-admin.validation')

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

router.get('/modules', authenticate, manageAuthorization, asyncHandler(listModulesController))
router.post('/modules', authenticate, manageAuthorization, requireIdempotency, validate(createModuleValidator), asyncHandler(createModuleController))
router.post('/modules/:moduleId/permissions', authenticate, authorizeModuleResource, requireIdempotency, validate(createPermissionValidator), asyncHandler(createPermissionController))
router.patch('/modules/:moduleId/active', authenticate, authorizeModuleResource, requireIdempotency, validate(setModuleActiveValidator), asyncHandler(setModuleActiveController))
router.get('/roles', authenticate, manageAuthorization, asyncHandler(listRolesController))
router.put('/roles/:roleId/permissions', authenticate, authorizeRoleResource, requireIdempotency, validate(replaceRolePermissionsValidator), asyncHandler(replaceRolePermissionsController))

module.exports = router
