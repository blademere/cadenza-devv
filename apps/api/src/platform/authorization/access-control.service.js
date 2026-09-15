import { getUserAuthorizationContext, findRoleById, findUserIdsByRoleId } from './access-control.repository.js'
import { hasCachedPermission, cacheUserPermissions, invalidateUserPermissionCache } from './access-control.cache.js'
import { increment } from '../observability/metrics/metrics.service.js'
import { getConfiguration } from '../configuration/configuration.service.js'
import { PLATFORM_CONFIGURATION_KEYS } from '../configuration/configuration.constants.js'

const AUTHORIZATION_CACHE_ENABLED = getConfiguration(PLATFORM_CONFIGURATION_KEYS.AUTHORIZATION_CACHE_ENABLED)
// Positive permission cache entries can become stale after a role/permission
// revocation. Keep PostgreSQL authoritative by default; explicitly opt in only
// when the deployment guarantees timely cache invalidation.
const AUTHORIZATION_CACHE_TRUST_POSITIVE = getConfiguration(PLATFORM_CONFIGURATION_KEYS.AUTHORIZATION_CACHE_TRUST_POSITIVE)

const getPermissionKey = (resource, action) => {
  if (typeof resource !== 'string' || !resource.trim()) {
    throw new TypeError('Authorization resource must be a non-empty string.')
  }

  if (typeof action !== 'string' || !action.trim()) {
    throw new TypeError('Authorization action must be a non-empty string.')
  }

  return `${resource.trim()}:${action.trim()}`
}

const loadUserPermissions = async (userId, appId = null) => {
  const context = await getUserAuthorizationContext({ userId, appId })
  if (!context) return { role: null, roles: [], permissions: [] }

  const permissions = context.permissions.map((permission) =>
    getPermissionKey(permission.resource, permission.action),
  )

  // The existing permission cache is keyed only by user. Do not use it for
  // app-scoped authorization or permissions could leak between applications.
  if (!appId && AUTHORIZATION_CACHE_ENABLED) {
    try {
      await cacheUserPermissions(userId, permissions)
    } catch {
      // PostgreSQL remains the source of truth.
    }
  }

  return {
    role: context.role ?? null,
    roles: context.roles ?? [],
    permissions,
  }
}

const hasPermission = async (userId, resource, action, appId = null) => {
  const permissionKey = getPermissionKey(resource, action)

  // Positive cache entries are intentionally bypassed for app-scoped checks.
  if (!appId && AUTHORIZATION_CACHE_ENABLED && AUTHORIZATION_CACHE_TRUST_POSITIVE) {
    try {
      const cachedPermission = await hasCachedPermission(userId, resource, action)
      if (cachedPermission === true) return true
    } catch {
      // Fall through to PostgreSQL.
    }
  }

  const { permissions } = await loadUserPermissions(userId, appId)
  const allowed = permissions.includes(permissionKey)
  if (!allowed) {
    increment('platform.authorization.denied', { resource, action })
  }
  return allowed
}

const getAuthorizationContext = async (userId, appId = null) => {
  const context = await loadUserPermissions(userId, appId)
  return {
    userId: Number(userId),
    role: context.role,
    roles: context.roles,
    permissions: new Set(context.permissions),
  }
}

const getRoleById = async (roleId) => findRoleById(roleId)

const can = async ({ userId, appId = null, resource, action }) =>
  hasPermission(userId, resource, action, appId)

const canAny = async ({ userId, appId = null, resource, action, actions }) => {
  const candidateActions = Array.isArray(actions)
    ? actions
    : action !== undefined
      ? [action]
      : []

  if (candidateActions.length === 0) return false

  for (const candidateAction of candidateActions) {
    if (await hasPermission(userId, resource, candidateAction, appId)) return true
  }

  return false
}

const canOwn = async ({ userId, appId = null, resource, action, resourceOwnerId }) => {
  if (Number(userId) !== Number(resourceOwnerId)) return false
  return can({ userId, appId, resource, action })
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

export {
  AUTHORIZATION_CACHE_ENABLED,
  AUTHORIZATION_CACHE_TRUST_POSITIVE,
  getPermissionKey,
  hasPermission,
  getAuthorizationContext,
  getRoleById,
  can,
  canAny,
  canOwn,
  clearUserPermissionCache,
  clearRolePermissionCache,
}
