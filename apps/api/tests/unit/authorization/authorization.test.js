import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, cache } = vi.hoisted(() => ({
  repository: {
    getUserAuthorizationContext: vi.fn(),
    findRoleById: vi.fn(),
    findUserIdsByRoleId: vi.fn(),
  },
  cache: {
    hasCachedPermission: vi.fn(),
    cacheUserPermissions: vi.fn(),
    invalidateUserPermissionCache: vi.fn(),
  },
}))

vi.mock('../../../src/platform/authorization/access-control.repository.js', () => repository)
vi.mock('../../../src/platform/authorization/access-control.cache.js', () => cache)

const { hasPermission, canAny, canOwn, clearRolePermissionCache } = await import('../../../src/platform/authorization/access-control.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  cache.hasCachedPermission.mockResolvedValue(null)
  cache.cacheUserPermissions.mockResolvedValue(undefined)
  cache.invalidateUserPermissionCache.mockResolvedValue(undefined)
  repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [] })
})

describe('permission policies', () => {
  it('allows ownership when user owns the resource', () => {
    const { ownershipPolicy } = require('../../../src/platform/authorization/access-control.policy')
    expect(ownershipPolicy({ userId: 10, ownerId: 10 })).toBe(true)
  })

  it('denies ownership when user does not own the resource', () => {
    const { ownershipPolicy } = require('../../../src/platform/authorization/access-control.policy')
    expect(ownershipPolicy({ userId: 10, ownerId: 20 })).toBe(false)
  })

  it('supports an explicit any-resource policy', () => {
    const { anyPolicy } = require('../../../src/platform/authorization/access-control.policy')
    expect(anyPolicy()).toBe(true)
  })

  it('evaluates asynchronous policies', async () => {
    const { evaluatePolicy } = require('../../../src/platform/authorization/access-control.policy')
    const policy = async ({ user, resource }) => user.id === resource.ownerId
    await expect(evaluatePolicy({ policy, user: { id: 10 }, resource: { ownerId: 10 } })).resolves.toBe(true)
  })
})

describe('access-control service', () => {
  it('builds correct permission keys from PostgreSQL context', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [{ resource: 'users', action: 'create' }, { resource: 'applications', action: 'approve' }] })
    await expect(hasPermission(7, 'users', 'create')).resolves.toBe(true)
    await expect(hasPermission(7, 'users', 'delete')).resolves.toBe(false)
    expect(cache.cacheUserPermissions).toHaveBeenCalledWith(7, ['users:create', 'applications:approve'])
  })

  it('refreshes PostgreSQL state when the cache contains a denial', async () => {
    cache.hasCachedPermission.mockResolvedValue(false)
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'admin', permissions: [{ resource: 'obo_permit_types', action: 'create' }] })
    await expect(hasPermission(7, 'obo_permit_types', 'create')).resolves.toBe(true)
    expect(repository.getUserAuthorizationContext).toHaveBeenCalledWith(7)
    expect(cache.cacheUserPermissions).toHaveBeenCalledWith(7, ['obo_permit_types:create'])
  })

  it('canAny allows access when any candidate action is granted', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [{ resource: 'applications', action: 'review' }] })
    await expect(canAny({ userId: 7, resource: 'applications', actions: ['approve', 'review'] })).resolves.toBe(true)
  })

  it('canAny denies access when no candidate action is granted', async () => {
    cache.hasCachedPermission.mockResolvedValue(false)
    await expect(canAny({ userId: 7, resource: 'applications', actions: ['approve', 'review'] })).resolves.toBe(false)
  })

  it('canAny remains backward compatible with a scalar action', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [{ resource: 'users', action: 'create' }] })
    await expect(canAny({ userId: 7, resource: 'users', action: 'create' })).resolves.toBe(true)
  })

  it('canOwn requires both ownership and permission', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({ role: 'operator', permissions: [{ resource: 'users', action: 'update' }] })
    await expect(canOwn({ userId: 7, resource: 'users', action: 'update', resourceOwnerId: 7 })).resolves.toBe(true)
    await expect(canOwn({ userId: 7, resource: 'users', action: 'update', resourceOwnerId: 8 })).resolves.toBe(false)
  })

  it('invalidates every user assigned to a changed role', async () => {
    repository.findUserIdsByRoleId.mockResolvedValue([7, 8, 9])
    await clearRolePermissionCache(3)
    expect(repository.findUserIdsByRoleId).toHaveBeenCalledWith(3)
    expect(cache.invalidateUserPermissionCache).toHaveBeenCalledTimes(3)
    expect(cache.invalidateUserPermissionCache).toHaveBeenCalledWith(7)
    expect(cache.invalidateUserPermissionCache).toHaveBeenCalledWith(8)
    expect(cache.invalidateUserPermissionCache).toHaveBeenCalledWith(9)
  })
})
