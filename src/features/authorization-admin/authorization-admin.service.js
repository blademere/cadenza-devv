const {
  ConflictError,
  NotFoundError,
  ValidationError,
} = require('../../common/errors/appError')
const repository = require('./authorization-admin.repository')
const { clearRolePermissionCache } = require('../../platform/authorization/access-control.service')

const listModules = () => repository.listModules()

const createModule = async ({ key, name, description }) => {
  const existing = await repository.findModuleByKey(key)
  if (existing) throw new ConflictError(`Module '${key}' already exists.`)
  return repository.createModule({ key, name, description })
}

const addPermission = async ({ moduleId, action }) => {
  const module = await repository.findModuleById(moduleId)
  if (!module) throw new NotFoundError('Module not found.')

  const existing = module.permissions.find((permission) => permission.action === action)
  if (existing) throw new ConflictError(`Permission '${action}' already exists for this module.`)

  return repository.createPermission({ moduleId, action })
}

const setModuleActive = async ({ moduleId, isActive }) => {
  const module = await repository.findModuleById(moduleId)
  if (!module) throw new NotFoundError('Module not found.')

  if (module.key === 'authorization' && !isActive) {
    throw new ValidationError('The authorization module cannot be disabled.')
  }

  const updated = await repository.setModuleActive(moduleId, isActive)
  const affectedRoles = await repository.listRoles()
  await Promise.all(affectedRoles.map((role) => clearRolePermissionCache(role.id)))
  return updated
}

const listRoles = async () => repository.listRoles()

const replaceRolePermissions = async ({ roleId, permissionIds }) => {
  const role = await repository.findRoleById(roleId)
  if (!role) throw new NotFoundError('Role not found.')

  const uniquePermissionIds = [...new Set(permissionIds)]
  for (const permissionId of uniquePermissionIds) {
    const permission = await repository.findPermissionById(permissionId)
    if (!permission) throw new NotFoundError(`Permission ${permissionId} not found.`)
  }

  const updated = await repository.replaceRolePermissions(roleId, uniquePermissionIds)
  await clearRolePermissionCache(roleId)
  return updated
}

module.exports = {
  listModules,
  createModule,
  addPermission,
  setModuleActive,
  listRoles,
  replaceRolePermissions,
}
