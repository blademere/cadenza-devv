const express = require('express')
const { asyncHandler, validate } = require('../../common/middleware')
const authenticate = require('../../features/auth/authenticate.secure')
const authorize = require('./authorize')
const {
  listModulesController,
  createModuleController,
  createPermissionController,
  listRolesController,
  replaceRolePermissionsController,
} = require('./authorization-admin.controller')
const {
  createModuleValidator,
  createPermissionValidator,
  replaceRolePermissionsValidator,
} = require('./authorization-admin.validation')

const router = express.Router()
const manageAuthorization = authorize('authorization', 'manage')

router.get('/modules', authenticate, manageAuthorization, asyncHandler(listModulesController))
router.post('/modules', authenticate, manageAuthorization, validate(createModuleValidator), asyncHandler(createModuleController))
router.post('/modules/:moduleId/permissions', authenticate, manageAuthorization, validate(createPermissionValidator), asyncHandler(createPermissionController))
router.get('/roles', authenticate, manageAuthorization, asyncHandler(listRolesController))
router.put('/roles/:roleId/permissions', authenticate, manageAuthorization, validate(replaceRolePermissionsValidator), asyncHandler(replaceRolePermissionsController))

module.exports = router
