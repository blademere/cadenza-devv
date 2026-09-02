const { getUserAuthorizationContext, findRoleById, findUserIdsByRoleId } = require('./access-control.repository')
const { hasCachedPermission, cacheUserPermissions, invalidateUserPermissionCache } = require('./access-control.cache')

const AUTHORIZATION_CACHE_ENABLED = process.env.AUTHORIZATION_CACHE_ENABLED !== 'false'

const getPermissionKey = (resource, action) => {
  if (typeof resource !== 'string' || !resource.trim()) {
    throw new TypeError('Authorization resource must be a non-empty string.')
  }

  if (typeof action !== 'string' || !action.trim()) {
    throw new TypeError('Authorization action must be a non-empty string.')
  }

  return `${resource.trim()}:${action.trim()}`
}

const loadUserPermissions = async (userId) => {
  const context = await getUserAuthorizationContext(userId)
  if (!context) return { role: null, permissions: [] }

  const permissions = context.permissions.map((permission) =>
    getPermissionKey(permission.resource, permission.action),
  )

  if (AUTHORIZATION_CACHE_ENABLED) {
    try {
      await cacheUserPermissions(userId, permissions)
    } catch {
      // PostgreSQL remains the source of truth.
    }
  }

  return { role: context.role, permissions }
}

const hasPermission = async (userId, resource, action) => {
  const permissionKey = getPermissionKey(resource, action)

  if (AUTHORIZATION_CACHE_ENABLED) {
    try {
      const cachedPermission = await hasCachedPermission(userId, resource, action)
      if (cachedPermission !== null) return cachedPermission
    } catch {
      // Fall through to PostgreSQL.
    }
  }

  const { permissions } = await loadUserPermissions(userId)
  return permissions.includes(permissionKey)
}

const getAuthorizationContext = async (userId) => {
  const context = await loadUserPermissions(userId)
  return {
    userId: Number(userId),
    role: context.role,
    permissions: new Set(context.permissions),
  }
}

const can = async ({ userId, resource, action }) =>
  hasPermission(userId, resource, action)

const canAny = async ({ userId, resource, action, actions }) => {
  const candidateActions = Array.isArray(actions)
    ? actions
    : action !== undefined
      ? [action]
      : []

  if (candidateActions.length === 0) return false

  for (const candidateAction of candidateActions) {
    if (await hasPermission(userId, resource, candidateAction)) return true
  }

  return false
}

const canOwn = async ({ userId, resource, action, resourceOwnerId }) => {
  if (Number(userId) !== Number(resourceOwnerId)) return false
  return can({ userId, resource, action })
}

const clearUserPermissionCache = async (userId) => {
  try {
    await invalidateUserPermissionCache(userId)
  } catch {
    // Cache invalidation is best effort and must not break the primary mutation.
  }
}

const clearRolePermissionCache = async (roleId) => {
  if (!AUTHORIZATION_CACHE_ENABLED) return

  const userIds = await findUserIdsByRoleId(roleId)
  await Promise.all(userIds.map((userId) => clearUserPermissionCache(userId)))
}

module.exports = {
  getPermissionKey,
  hasPermission,
  getAuthorizationContext,
  can,
  canAny,
  canOwn,
  clearUserPermissionCache,
  clearRolePermissionCache,
  findRoleById,
}
