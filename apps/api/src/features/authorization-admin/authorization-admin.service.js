import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/appError.js'
import { cache } from '../../common/middleware/cache.js'
import repository from './authorization-admin.repository.js'
import { clearRolePermissionCache } from '../../platform/authorization/access-control.service.js'

const AUTHORIZATION_MODULES_CACHE_KEY = 'authorization:modules'
const AUTHORIZATION_ROLES_CACHE_KEY = 'authorization:roles'

const invalidateAuthorizationCache = async (...keys) => {
  await Promise.all(keys.map((key) => cache.invalidate(key)))
}

const listModules = () => repository.listModules()

const getModuleById = (moduleId) => repository.findModuleById(moduleId)

const createModule = async ({ key, name, description }) => {
  const existing = await repository.findModuleByKey(key)
  if (existing) throw new ConflictError(`Module '${key}' already exists.`)
  const module = await repository.createModule({ key, name, description })
  await invalidateAuthorizationCache(
    AUTHORIZATION_MODULES_CACHE_KEY,
    AUTHORIZATION_ROLES_CACHE_KEY
  )
  return module
}

const addPermission = async ({ moduleId, action }) => {
  const module = await repository.findModuleById(moduleId)
  if (!module) throw new NotFoundError('Module not found.')

  const existing = module.permissions.find(
    (permission) => permission.action === action
  )
  if (existing)
    throw new ConflictError(
      `Permission '${action}' already exists for this module.`
    )

  const permission = await repository.createPermission({ moduleId, action })
  await invalidateAuthorizationCache(
    AUTHORIZATION_MODULES_CACHE_KEY,
    AUTHORIZATION_ROLES_CACHE_KEY
  )
  return permission
}

const setModuleActive = async ({ moduleId, isActive }) => {
  const module = await repository.findModuleById(moduleId)
  if (!module) throw new NotFoundError('Module not found.')

  if (module.key === 'authorization' && !isActive) {
    throw new ValidationError('The authorization module cannot be disabled.')
  }

  const updated = await repository.setModuleActive(moduleId, isActive)
  const affectedRoles = await repository.listRoles()
  await Promise.all(
    affectedRoles.map((role) => clearRolePermissionCache(role.id))
  )
  await invalidateAuthorizationCache(
    AUTHORIZATION_MODULES_CACHE_KEY,
    AUTHORIZATION_ROLES_CACHE_KEY
  )
  return updated
}

const listRoles = () => repository.listRoles()

const getRoleById = (roleId) => repository.findRoleById(roleId)

const replaceRolePermissions = async ({
  roleId,
  permissionIds,
  actorUserId,
}) => {
  const role = await repository.findRoleWithPermissions(roleId)
  if (!role) throw new NotFoundError('Role not found.')

  const uniquePermissionIds = [...new Set(permissionIds)]
  const permissions = []
  for (const permissionId of uniquePermissionIds) {
    const permission = await repository.findPermissionById(permissionId)
    if (!permission)
      throw new NotFoundError(`Permission ${permissionId} not found.`)
    if (!permission.module.isActive) {
      throw new ValidationError(
        `Permission '${permission.module.key}:${permission.action}' belongs to an inactive module.`
      )
    }
    permissions.push(permission)
  }

  const authorizationManagePermission =
    await repository.findPermissionByModuleAction('authorization', 'manage')
  if (!authorizationManagePermission) {
    throw new ValidationError(
      'The canonical authorization:manage permission is not configured.'
    )
  }

  const currentPermissionIds = new Set(
    role.permissions.map((permission) => permission.permissionId)
  )
  const currentlyManagesAuthorization = currentPermissionIds.has(
    authorizationManagePermission.id
  )
  const willManageAuthorization = uniquePermissionIds.includes(
    authorizationManagePermission.id
  )

  if (currentlyManagesAuthorization && !willManageAuthorization) {
    const remainingManagingRoles = await repository.countRolesWithPermission(
      authorizationManagePermission.id,
      roleId
    )

    if (remainingManagingRoles === 0) {
      throw new ValidationError(
        'Cannot remove authorization:manage from the last authorization administrator role.'
      )
    }

    if (actorUserId !== undefined && actorUserId !== null) {
      const actor = await repository.findUserById(Number(actorUserId))
      if (actor?.roleId === roleId) {
        throw new ValidationError(
          'You cannot remove authorization:manage from your own role.'
        )
      }
    }
  }

  const updated = await repository.replaceRolePermissions(
    roleId,
    uniquePermissionIds
  )
  await clearRolePermissionCache(roleId)
  await invalidateAuthorizationCache(AUTHORIZATION_ROLES_CACHE_KEY)
  return updated
}

export {
  AUTHORIZATION_MODULES_CACHE_KEY,
  AUTHORIZATION_ROLES_CACHE_KEY,
  listModules,
  getModuleById,
  createModule,
  addPermission,
  setModuleActive,
  listRoles,
  getRoleById,
  replaceRolePermissions,
}
