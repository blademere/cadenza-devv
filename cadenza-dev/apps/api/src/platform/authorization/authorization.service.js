import { getUserAuthorizationContext, findUserIdsByRoleId, listActiveModules } from './authorization.repository.js'
import { hasCachedPermission, cacheUserPermissions, invalidateUserPermissionCache } from './authorization.cache.js'
import { getContext } from '../context/context.service.js'
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

const resolveAppId = (appId) => requireAppId(appId ?? getContext()?.appId)

const loadUserPermissions = async (userId, appId) => {
  const resolvedAppId = resolveAppId(appId)
  const context = await getUserAuthorizationContext({ userId, appId: resolvedAppId })
  if (!context) return { roles: [], permissions: [] }
  const permissions = context.permissions.map((permission) => getPermissionKey(permission.resource, permission.action))

  if (AUTHORIZATION_CACHE_ENABLED) {
    try { await cacheUserPermissions(userId, resolvedAppId, permissions) } catch { /* PostgreSQL remains authoritative. */ }
  }

  return { roles: context.roles ?? [], permissions }
}

const hasPermission = async (userId, resource, action, appId) => {
  const resolvedAppId = resolveAppId(appId)
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

const getAuthorizationContextResponse = async ({ userId, appId }) => {
  const [context, modules] = await Promise.all([
    getUserAuthorizationContext({ userId, appId }),
    listActiveModules({ appId }),
  ])

  const permissions = new Set(
    (context?.permissions ?? []).map(({ resource, action }) => `${resource}:${action}`),
  )

  return {
    userId: context?.userId ?? Number(userId),
    app: context?.app ?? null,
    membership: context?.membership ?? null,
    roles: context?.roles ?? [],
    permissions: [...permissions].sort(),
    modules: (modules ?? []).map(({ key, name, description, isActive }) => ({
      key,
      name,
      description,
      isActive,
    })),
  }
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
  try { await invalidateUserPermissionCache(userId, resolveAppId(appId)) } catch { /* Best effort. */ }
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
  getAuthorizationContextResponse,
  can,
  canAny,
  canOwn,
  clearUserPermissionCache,
  clearRolePermissionCache,
}
