import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/appError.js'
import repository from './authorization-admin.repository.js'
import { clearRolePermissionCache } from '../../platform/authorization/access-control.service.js'

const listModules = () => repository.listModules()

const createModule = async ({ key, name, description }) => {
  const existing = await repository.findModuleByKey(key)
  if (existing) throw new ConflictError(`Module '${key}' already exists.`)
  return repository.createModule({ key, name, description })
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
  await Promise.all(
    affectedRoles.map((role) => clearRolePermissionCache(role.id))
  )
  return updated
}

const listRoles = async () => repository.listRoles()

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
  return updated
}

export {
  listModules,
  createModule,
  addPermission,
  setModuleActive,
  listRoles,
  replaceRolePermissions,
}
