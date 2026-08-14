const {
  getUserPermissions,
  findRoleById,
  findUserIdsByRoleId,
} = require('./access-control.repository')

const {
  hasCachedPermission,
  cacheUserPermissions,
  invalidateUserPermissionCache,
} = require('./access-control.cache')

const hasPermission = async (userId, moduleKey, action) => {
  try {
    const cachedPermission = await hasCachedPermission(
      userId,
      moduleKey,
      action
    )

    if (cachedPermission !== null) {
      return cachedPermission
    }
  } catch {
    // Ignore Redis errors.
    // PostgreSQL remains the source of truth.
  }

  const permissions = await getUserPermissions(userId)

  try {
    await cacheUserPermissions(userId, permissions)
  } catch {
    // Ignore Redis cache errors.
  }

  return permissions.includes(`${moduleKey}:${action}`)
}

const clearUserPermissionCache = async (userId) => {
  try {
    await invalidateUserPermissionCache(userId)
  } catch {
    // Cache invalidation failure should not break
    // the primary database operation.
  }
}

const clearRolePermissionCache = async (roleId) => {
  const userIds = await findUserIdsByRoleId(roleId)

  await Promise.all(userIds.map((userId) => clearUserPermissionCache(userId)))
}

module.exports = {
  hasPermission,
  clearUserPermissionCache,
  clearRolePermissionCache,
  findRoleById,
}
