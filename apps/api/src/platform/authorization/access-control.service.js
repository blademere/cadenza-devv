import { getUserAuthorizationContext, findUserIdsByRoleId } from './access-control.repository.js'
import { hasCachedPermission, cacheUserPermissions, invalidateUserPermissionCache } from './access-control.cache.js'
import { increment } from '../observability/metrics/metrics.service.js'
import { getConfiguration } from '../configuration/configuration.service.js'
import { PLATFORM_CONFIGURATION_KEYS } from '../configuration/configuration.constants.js'

const AUTHORIZATION_CACHE_ENABLED = getConfiguration(PLATFORM_CONFIGURATION_KEYS.AUTHORIZATION_CACHE_ENABLED)
const AUTHORIZATION_CACHE_TRUST_POSITIVE = getConfiguration(PLATFORM_CONFIGURATION_KEYS.AUTHORIZATION_CACHE_TRUST_POSITIVE)

const getPermissionKey = (resource, action) => {
  if (typeof resource !== 'string' || !resource.trim()) throw new TypeError('Authorization resource must be a non-empty string.')
  if (typeof action !== 'string' || !action.trim()) throw new TypeError('Authorization action must be a non-empty string.')
  return `${resource.trim()}:${action.trim()}`
}

const requireAppId = (appId) => {
  if (typeof appId !== 'string' || !appId.trim()) {
    throw new TypeError('Application context is required for authorization.')
  }
  return appId.trim()
}

const loadUserPermissions = async (userId, appId) => {
  const resolvedAppId = requireAppId(appId)
  const context = await getUserAuthorizationContext({ userId, appId: resolvedAppId })
  if (!context) return { roles: [], permissions: [] }
  const permissions = context.permissions.map((permission) => getPermissionKey(permission.resource, permission.action))

  if (AUTHORIZATION_CACHE_ENABLED) {
    try { await cacheUserPermissions(userId, resolvedAppId, permissions) } catch { /* PostgreSQL remains authoritative. */ }
  }

  return { roles: context.roles ?? [], permissions }
}

const hasPermission = async (userId, resource, action, appId) => {
  const resolvedAppId = requireAppId(appId)
  const permissionKey = getPermissionKey(resource, action)

  if (AUTHORIZATION_CACHE_ENABLED && AUTHORIZATION_CACHE_TRUST_POSITIVE) {
    try {
      const cachedPermission = await hasCachedPermission(userId, resolvedAppId, resource, action)
      if (cachedPermission === true) return true
    } catch { /* Fall through to PostgreSQL. */ }
  }

  const { permissions } = await loadUserPermissions(userId, resolvedAppId)
  const allowed = permissions.includes(permissionKey)
  if (!allowed) increment('platform.authorization.denied', { appId: resolvedAppId, resource, action })
  return allowed
}

const getAuthorizationContext = async (userId, appId) => {
  const context = await loadUserPermissions(userId, appId)
  return { userId: Number(userId), roles: context.roles, permissions: new Set(context.permissions) }
}

const can = async ({ userId, appId, resource, action }) => hasPermission(userId, resource, action, appId)

const canAny = async ({ userId, appId, resource, action, actions }) => {
  const candidateActions = Array.isArray(actions) ? actions : action !== undefined ? [action] : []
  if (candidateActions.length === 0) return false
  for (const candidateAction of candidateActions) if (await hasPermission(userId, resource, candidateAction, appId)) return true
  return false
}

const canOwn = async ({ userId, appId, resource, action, resourceOwnerId }) => {
  if (Number(userId) !== Number(resourceOwnerId)) return false
  return can({ userId, appId, resource, action })
}

const clearUserPermissionCache = async (userId, appId) => {
  if (!AUTHORIZATION_CACHE_ENABLED) return
  try { await invalidateUserPermissionCache(userId, requireAppId(appId)) } catch { /* Best effort. */ }
}

const clearRolePermissionCache = async (roleId) => {
  if (!AUTHORIZATION_CACHE_ENABLED) return
  const assignments = await findUserIdsByRoleId(roleId)
  await Promise.all(assignments.map(({ userId, appId }) => clearUserPermissionCache(userId, appId)))
}

export {
  AUTHORIZATION_CACHE_ENABLED,
  AUTHORIZATION_CACHE_TRUST_POSITIVE,
  getPermissionKey,
  hasPermission,
  getAuthorizationContext,
  can,
  canAny,
  canOwn,
  clearUserPermissionCache,
  clearRolePermissionCache,
}
