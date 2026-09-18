import { ConflictError, NotFoundError, ValidationError } from '../../../common/errors/appError.js'
import { clearRolePermissionCache } from '../../../platform/authorization/authorization.service.js'
import * as repository from './authorization-management.repository.js'

const OBO_AUTHORIZATION_MODULE_PREFIX = 'obo_'

const assertOBOAuthorizationModule = (module) => {
  if (!module || !module.key.startsWith(OBO_AUTHORIZATION_MODULE_PREFIX)) {
    throw new NotFoundError('OBO authorization module not found.')
  }
  return module
}

const listModules = () => repository.listModules()
const getModule = async (moduleId) => assertOBOAuthorizationModule(await repository.findModuleById(moduleId))

const createModule = async ({ key, name, description }) => {
  if (!key.startsWith(OBO_AUTHORIZATION_MODULE_PREFIX)) {
    throw new ValidationError(`Authorization module key must start with '${OBO_AUTHORIZATION_MODULE_PREFIX}'.`)
  }
  if (await repository.findModuleByKey(key)) throw new ConflictError(`Module '${key}' already exists.`)
  return repository.createModule({ key, name, description })
}

const addPermission = async ({ moduleId, action }) => {
  const module = assertOBOAuthorizationModule(await repository.findModuleById(moduleId))
  if (module.permissions.some((permission) => permission.action === action)) {
    throw new ConflictError(`Permission '${action}' already exists for this module.`)
  }
  return repository.createPermission({ moduleId: module.id, action })
}

const setModuleActive = async ({ moduleId, isActive }) => {
  const module = assertOBOAuthorizationModule(await repository.findModuleById(moduleId))
  if (!isActive && module.key === `${OBO_AUTHORIZATION_MODULE_PREFIX}authorization`) {
    throw new ValidationError('The authorization module cannot be disabled.')
  }
  const updated = await repository.setModuleActive(module.id, isActive)
  const affectedRoles = await repository.listRoleIdsByModuleId(module.id)
  await Promise.all(affectedRoles.map(({ roleId }) => clearRolePermissionCache(roleId)))
  return updated
}

const listRoles = ({ appId }) => repository.listRoles(appId)

const createRole = async ({ appId, membershipId, name, description }) => {
  if (!(await repository.findMembershipById(membershipId, appId))) {
    throw new NotFoundError('Application membership not found.')
  }
  try {
    const role = await repository.createRole({ appId, name, description, membershipId })
    if (!role) throw new NotFoundError('Application membership not found.')
    return role
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError(`Role '${name}' already exists in the current application.`)
    throw error
  }
}

const getRole = async ({ roleId, appId }) => {
  const role = await repository.findRoleForApp(roleId, appId)
  if (!role) throw new NotFoundError('Role not found in the current application.')
  return repository.findRoleById(role.id, appId)
}

const getMembership = async ({ membershipId, appId }) => {
  const membership = await repository.findMembershipById(membershipId, appId)
  if (!membership) throw new NotFoundError('Application membership not found.')
  return membership
}

const replaceRolePermissions = async ({ roleId, permissionIds, appId }) => {
  const role = await repository.findRoleForApp(roleId, appId)
  if (!role) throw new NotFoundError('Role not found in the current application.')

  const uniquePermissionIds = [...new Set(permissionIds.map(Number))]
  const permissions = await Promise.all(uniquePermissionIds.map((id) => repository.findPermissionById(id)))
  if (permissions.some((permission) => !permission)) throw new NotFoundError('One or more permissions were not found.')
  if (permissions.some((permission) => !permission.module.isActive)) throw new ValidationError('Permissions from inactive modules cannot be assigned.')
  if (permissions.some((permission) => !permission.module.key.startsWith(OBO_AUTHORIZATION_MODULE_PREFIX))) {
    throw new ValidationError('A role can only contain permissions from OBO authorization modules.')
  }

  const updated = await repository.replaceRolePermissions(roleId, appId, uniquePermissionIds)
  if (updated === undefined) throw new ValidationError('One or more permissions do not belong to OBO authorization modules.')
  if (updated === null) throw new NotFoundError('Role not found in the current application.')
  await clearRolePermissionCache(roleId)
  return updated
}

const listMembershipRoles = ({ membershipId, appId }) => repository.listMembershipRoles(membershipId, appId)

const replaceMembershipRoles = async ({ membershipId, appId, roleIds }) => {
  if (!(await repository.findMembershipById(membershipId, appId))) {
    throw new NotFoundError('Application membership not found.')
  }
  const result = await repository.replaceMembershipRoles(membershipId, appId, [...new Set(roleIds.map(Number))])
  if (result === undefined) throw new ValidationError('One or more roles do not belong to the current application.')
  if (result === null) throw new NotFoundError('Application membership not found.')
  return result
}

export {
  OBO_AUTHORIZATION_MODULE_PREFIX,
  listModules,
  getModule,
  createModule,
  addPermission,
  setModuleActive,
  listRoles,
  createRole,
  getRole,
  getMembership,
  replaceRolePermissions,
  listMembershipRoles,
  replaceMembershipRoles,
}
