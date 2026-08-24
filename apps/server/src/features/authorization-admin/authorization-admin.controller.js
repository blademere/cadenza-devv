const { successResponse } = require('../../common/responses/apiResponse')
const service = require('./authorization-admin.service')

const listModulesController = async (_req, res) => {
  const modules = await service.listModules()
  return successResponse(res, 'Authorization modules retrieved successfully.', modules)
}

const createModuleController = async (req, res) => {
  const module = await service.createModule(req.validated.body)
  return successResponse(res, 'Authorization module created successfully.', module, 201)
}

const createPermissionController = async (req, res) => {
  const permission = await service.addPermission({
    moduleId: req.validated.params.moduleId,
    action: req.validated.body.action,
  })
  return successResponse(res, 'Permission created successfully.', permission, 201)
}

const setModuleActiveController = async (req, res) => {
  const module = await service.setModuleActive({
    moduleId: req.validated.params.moduleId,
    isActive: req.validated.body.isActive,
  })
  return successResponse(res, 'Authorization module activation updated successfully.', module)
}

const listRolesController = async (_req, res) => {
  const roles = await service.listRoles()
  return successResponse(res, 'Roles and permissions retrieved successfully.', roles)
}

const replaceRolePermissionsController = async (req, res) => {
  const role = await service.replaceRolePermissions({
    roleId: req.validated.params.roleId,
    permissionIds: req.validated.body.permissionIds,
  })
  return successResponse(res, 'Role permissions updated successfully.', role)
}

module.exports = {
  listModulesController,
  createModuleController,
  createPermissionController,
  setModuleActiveController,
  listRolesController,
  replaceRolePermissionsController,
}
