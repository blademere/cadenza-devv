const {
  getUserPermissions,
  findRoleById,
  findUserIdsByRoleId,
} = require("./rbac.repository")

const {
  hasCachedPermission,
  cacheUserPermissions,
  invalidateUserPermissionCache,
} = require("./rbac.cache")

const hasPermission = async (userId, moduleKey, action) => {
  /*
   * Redis is only a cache.
   *
   * If Redis is unavailable, fall back to PostgreSQL.
   */
  try {
    const cachedPermission = await hasCachedPermission(
      userId,
      moduleKey,
      action,
    )

    if (cachedPermission !== null) {
      return cachedPermission
    }
  } catch (_error) {
    // Ignore Redis errors.
    // PostgreSQL remains the source of truth.
  }

  const permissions = await getUserPermissions(userId)

  /*
   * Try to populate the cache.
   * A Redis failure should not break authorization.
   */
  try {
    await cacheUserPermissions(userId, permissions)
  } catch (_error) {
    // Ignore Redis cache errors.
  }

  return permissions.includes(`${moduleKey}:${action}`)
}

const clearUserPermissionCache = async (userId) => {
  try {
    await invalidateUserPermissionCache(userId)
  } catch (_error) {
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
