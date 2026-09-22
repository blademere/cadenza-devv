import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, cache } = vi.hoisted(() => ({
  repository: {
    getUserAuthorizationContext: vi.fn(),
    findUserIdsByRoleId: vi.fn(),
  },
  cache: {
    hasCachedPermission: vi.fn(),
    cacheUserPermissions: vi.fn(),
    invalidateUserPermissionCache: vi.fn(),
  },
}))

vi.mock('../../../src/platform/authorization/authorization.repository.js', () => repository)
vi.mock('../../../src/platform/authorization/authorization.cache.js', () => cache)

const { hasPermission, canAny, canOwn, clearRolePermissionCache } = await import('../../../src/platform/authorization/authorization.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  cache.hasCachedPermission.mockResolvedValue(null)
  cache.cacheUserPermissions.mockResolvedValue(undefined)
  cache.invalidateUserPermissionCache.mockResolvedValue(undefined)
  repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [] })
})

describe('authorization policy', () => {
  it('allows ownership when user owns the resource', () => {
    const { ownershipPolicy } = require('../../../src/platform/authorization/authorization.policy')
    expect(ownershipPolicy({ user: { id: 10 }, resource: { ownerId: 10 } })).toBe(true)
  })

  it('denies ownership when user does not own the resource', () => {
    const { ownershipPolicy } = require('../../../src/platform/authorization/authorization.policy')
    expect(ownershipPolicy({ user: { id: 10 }, resource: { ownerId: 20 } })).toBe(false)
  })

  it('evaluates asynchronous policies', async () => {
    const { evaluatePolicy } = require('../../../src/platform/authorization/authorization.policy')
    const policy = async ({ user, resource }) => user.id === resource.ownerId
    await expect(evaluatePolicy({ policy, user: { id: 10 }, resource: { ownerId: 10 } })).resolves.toBe(true)
  })
})

describe('authorization service', () => {
  it('builds correct permission keys from application-scoped PostgreSQL context', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [{ resource: 'users', action: 'create' }, { resource: 'applications', action: 'approve' }] })
    await expect(hasPermission(7, 'users', 'create', 'app-obo')).resolves.toBe(true)
    await expect(hasPermission(7, 'users', 'delete', 'app-obo')).resolves.toBe(false)
    expect(cache.cacheUserPermissions).toHaveBeenCalledWith(7, 'app-obo', ['users:create', 'applications:approve'])
  })

  it('requires application context before evaluating permissions', async () => {
    await expect(hasPermission(7, 'users', 'create')).rejects.toThrow('Application context is required for authorization.')
    expect(cache.hasCachedPermission).not.toHaveBeenCalled()
    expect(repository.getUserAuthorizationContext).not.toHaveBeenCalled()
  })

  it('refreshes PostgreSQL state when the application-scoped cache contains a denial', async () => {
    cache.hasCachedPermission.mockResolvedValue(false)
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'admin', permissions: [{ resource: 'obo_permit_types', action: 'create' }] })
    await expect(hasPermission(7, 'obo_permit_types', 'create', 'app-obo')).resolves.toBe(true)
    expect(repository.getUserAuthorizationContext).toHaveBeenCalledWith({ userId: 7, appId: 'app-obo' })
    expect(cache.cacheUserPermissions).toHaveBeenCalledWith(7, 'app-obo', ['obo_permit_types:create'])
  })

  it('canAny allows access when any candidate action is granted', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [{ resource: 'applications', action: 'review' }] })
    await expect(canAny({ userId: 7, appId: 'app-obo', resource: 'applications', actions: ['approve', 'review'] })).resolves.toBe(true)
  })

  it('canAny denies access when no candidate action is granted', async () => {
    cache.hasCachedPermission.mockResolvedValue(false)
    await expect(canAny({ userId: 7, appId: 'app-obo', resource: 'applications', actions: ['approve', 'review'] })).resolves.toBe(false)
  })

  it('canAny remains scalar-action compatible with application context', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [{ resource: 'users', action: 'create' }] })
    await expect(canAny({ userId: 7, appId: 'app-obo', resource: 'users', action: 'create' })).resolves.toBe(true)
  })

  it('canOwn requires both ownership and application-scoped permission', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [{ resource: 'users', action: 'update' }] })
    await expect(canOwn({ userId: 7, appId: 'app-obo', resource: 'users', action: 'update', resourceOwnerId: 7 })).resolves.toBe(true)
    await expect(canOwn({ userId: 7, appId: 'app-obo', resource: 'users', action: 'update', resourceOwnerId: 8 })).resolves.toBe(false)
  })

  it('invalidates every application-scoped cache entry assigned to a changed role', async () => {
    repository.findUserIdsByRoleId.mockResolvedValue([
      { userId: 7, appId: 'app-obo' },
      { userId: 8, appId: 'app-obo' },
      { userId: 7, appId: 'app-cadenza' },
    ])
    await clearRolePermissionCache(3)
    expect(repository.findUserIdsByRoleId).toHaveBeenCalledWith(3)
    expect(cache.invalidateUserPermissionCache).toHaveBeenCalledTimes(3)
    expect(cache.invalidateUserPermissionCache).toHaveBeenCalledWith(7, 'app-obo')
    expect(cache.invalidateUserPermissionCache).toHaveBeenCalledWith(8, 'app-obo')
    expect(cache.invalidateUserPermissionCache).toHaveBeenCalledWith(7, 'app-cadenza')
  })
})
