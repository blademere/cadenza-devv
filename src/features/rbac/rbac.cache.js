const { connectRedis } = require("../../infrastructure/cache/redis")

const PERMISSION_CACHE_TTL = 300

const getPermissionCacheKey = (userId) => {
  return `rbac:user:${userId}:permissions`
}

const hasCachedPermission = async (userId, moduleKey, action) => {
  const redis = await connectRedis()

  const key = getPermissionCacheKey(userId)

  const exists = await redis.exists(key)

  if (!exists) {
    return null
  }

  const permission = `${moduleKey}:${action}`

  return Boolean(await redis.sIsMember(key, permission))
}

const cacheUserPermissions = async (userId, permissions) => {
  const redis = await connectRedis()

  const key = getPermissionCacheKey(userId)

  await redis.del(key)

  if (permissions.length > 0) {
    await redis.sAdd(key, permissions)
    await redis.expire(key, PERMISSION_CACHE_TTL)
  }

  return permissions
}

const invalidateUserPermissionCache = async (userId) => {
  const redis = await connectRedis()

  const key = getPermissionCacheKey(userId)

  await redis.del(key)
}

module.exports = {
  PERMISSION_CACHE_TTL,
  getPermissionCacheKey,
  hasCachedPermission,
  cacheUserPermissions,
  invalidateUserPermissionCache,
}
