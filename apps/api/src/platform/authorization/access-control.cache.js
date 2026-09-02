import { connectRedis } from "../../infrastructure/cache/redis.js"

const PERMISSION_CACHE_TTL = 1800

const getPermissionKey = (resource, action) => {
  if (!resource || !action) {
    throw new Error("Permission resource and action are required")
  }

  return `${resource}:${action}`
}

const getPermissionCacheKey = (userId) => {
  return `access-control:user:${userId}:permissions`
}

const hasCachedPermission = async (userId, resource, action) => {
  const redis = await connectRedis()
  const key = getPermissionCacheKey(userId)
  const exists = await redis.exists(key)

  if (!exists) {
    return null
  }

  const granted = await redis.sIsMember(key, getPermissionKey(resource, action))

  return granted ? true : null
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
  await redis.del(getPermissionCacheKey(userId))
}

export {
  PERMISSION_CACHE_TTL,
  getPermissionCacheKey,
  hasCachedPermission,
  cacheUserPermissions,
  invalidateUserPermissionCache,
}
