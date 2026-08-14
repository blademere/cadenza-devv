const {
  getUserAuthorizationContext,
  findRoleById,
  findUserIdsByRoleId,
} = require("./access-control.repository")

const {
  hasCachedPermission,
  cacheUserPermissions,
  invalidateUserPermissionCache,
} = require("./access-control.cache")

const { getPermissionKey } = require("./access-control.constants")

const loadUserPermissions = async (userId) => {
  try {
    const context = await getUserAuthorizationContext(userId)

    if (!context) {
      return { role: null, permissions: [] }
    }

    const permissions = context.permissions.map((permission) =>
      getPermissionKey(permission.resource, permission.action),
    )

    try {
      await cacheUserPermissions(userId, permissions)
    } catch {
      // Redis is an optimization. PostgreSQL remains the source of truth.
    }

    return {
      role: context.role,
      permissions,
    }
  } catch (error) {
    throw error
  }
}

const hasPermission = async (userId, resource, action) => {
  try {
    const cachedPermission = await hasCachedPermission(userId, resource, action)

    if (cachedPermission !== null) {
      return cachedPermission
    }
  } catch {
    // Ignore Redis errors and fall back to PostgreSQL.
  }

  const { permissions } = await loadUserPermissions(userId)
  return permissions.includes(getPermissionKey(resource, action))
}

const getAuthorizationContext = async (userId) => {
  const context = await loadUserPermissions(userId)

  return {
    userId: Number(userId),
    role: context.role,
    permissions: new Set(context.permissions),
  }
}

const can = async ({ userId, resource, action }) => {
  return hasPermission(userId, resource, action)
}

const canAny = async ({ userId, resource, action }) => {
  return can({ userId, resource, action })
}

const canOwn = async ({ userId, resource, action, resourceOwnerId }) => {
  if (Number(userId) !== Number(resourceOwnerId)) {
    return false
  }

  return can({ userId, resource, action })
}

const clearUserPermissionCache = async (userId) => {
  try {
    await invalidateUserPermissionCache(userId)
  } catch {
    // Cache invalidation failure should not break the primary operation.
  }
}

const clearRolePermissionCache = async (roleId) => {
  const userIds = await findUserIdsByRoleId(roleId)

  await Promise.all(userIds.map((userId) => clearUserPermissionCache(userId)))
}

module.exports = {
  hasPermission,
  getAuthorizationContext,
  can,
  canAny,
  canOwn,
  clearUserPermissionCache,
  clearRolePermissionCache,
  findRoleById,
}
