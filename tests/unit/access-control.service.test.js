import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  getUserAuthorizationContext: vi.fn(),
  findRoleById: vi.fn(),
  findUserIdsByRoleId: vi.fn(),
}))

const cache = vi.hoisted(() => ({
  hasCachedPermission: vi.fn(),
  cacheUserPermissions: vi.fn(),
  invalidateUserPermissionCache: vi.fn(),
}))

vi.mock('../../src/features/access-control/access-control.repository', () => repository)
vi.mock('../../src/features/access-control/access-control.cache', () => cache)

const {
  hasPermission,
  canAny,
  canOwn,
  clearRolePermissionCache,
} = await import('../../src/features/access-control/access-control.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  cache.hasCachedPermission.mockResolvedValue(null)
  cache.cacheUserPermissions.mockResolvedValue(undefined)
  cache.invalidateUserPermissionCache.mockResolvedValue(undefined)
})

describe('access-control service', () => {
  it('builds correct permission keys from PostgreSQL context', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      role: 'operator',
      permissions: [
        { resource: 'users', action: 'create' },
        { resource: 'applications', action: 'approve' },
      ],
    })

    await expect(hasPermission(7, 'users', 'create')).resolves.toBe(true)
    await expect(hasPermission(7, 'users', 'delete')).resolves.toBe(false)
    expect(cache.cacheUserPermissions).toHaveBeenCalledWith(7, [
      'users:create',
      'applications:approve',
    ])
  })

  it('canAny allows access when any candidate action is granted', async () => {
    cache.hasCachedPermission
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    await expect(
      canAny({
        userId: 7,
        resource: 'applications',
        actions: ['approve', 'review'],
      }),
    ).resolves.toBe(true)
  })

  it('canAny denies access when no candidate action is granted', async () => {
    cache.hasCachedPermission.mockResolvedValue(false)

    await expect(
      canAny({
        userId: 7,
        resource: 'applications',
        actions: ['approve', 'review'],
      }),
    ).resolves.toBe(false)
  })

  it('canAny remains backward compatible with a scalar action', async () => {
    cache.hasCachedPermission.mockResolvedValue(true)

    await expect(
      canAny({ userId: 7, resource: 'users', action: 'create' }),
    ).resolves.toBe(true)
  })

  it('canOwn requires both ownership and permission', async () => {
    cache.hasCachedPermission.mockResolvedValue(true)

    await expect(
      canOwn({
        userId: 7,
        resource: 'users',
        action: 'update',
        resourceOwnerId: 7,
      }),
    ).resolves.toBe(true)

    await expect(
      canOwn({
        userId: 7,
        resource: 'users',
        action: 'update',
        resourceOwnerId: 8,
      }),
    ).resolves.toBe(false)
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
