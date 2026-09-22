import { connectRedis } from "../../infrastructure/cache/redis.js"

const PERMISSION_CACHE_TTL = 1800

const getPermissionKey = (resource, action) => {
  if (!resource || !action) {
    throw new Error("Permission resource and action are required")
  }

  return `${resource}:${action}`
}

const getPermissionCacheKey = (userId, appId) => {
  if (!userId || !appId) {
    throw new Error("Permission cache user and application are required")
  }

  return `access-control:user:${userId}:app:${appId}:permissions`
}

const hasCachedPermission = async (userId, appId, resource, action) => {
  const redis = await connectRedis()
  const key = getPermissionCacheKey(userId, appId)
  const exists = await redis.exists(key)

  if (!exists) return null

  return Boolean(await redis.sIsMember(key, getPermissionKey(resource, action)))
}

const cacheUserPermissions = async (userId, appId, permissions) => {
  const redis = await connectRedis()
  const key = getPermissionCacheKey(userId, appId)

  await redis.del(key)

  if (permissions.length > 0) {
    await redis.sAdd(key, permissions)
    await redis.expire(key, PERMISSION_CACHE_TTL)
  }

  return permissions
}

const invalidateUserPermissionCache = async (userId, appId) => {
  const redis = await connectRedis()
  await redis.del(getPermissionCacheKey(userId, appId))
}

export {
  PERMISSION_CACHE_TTL,
  getPermissionCacheKey,
  hasCachedPermission,
  cacheUserPermissions,
  invalidateUserPermissionCache,
}
