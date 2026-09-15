import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'

const {
  getRedisClient,
  connectRedis,
  disconnectRedis,
} = await import('../../../src/infrastructure/cache/redis.js')
const {
  PERMISSION_CACHE_TTL,
  getPermissionCacheKey,
  hasCachedPermission,
  cacheUserPermissions,
  invalidateUserPermissionCache,
} = await import('../../../src/platform/authorization/access-control.cache.js')
const runIntegrationTests = process.env.RUN_REDIS_INTEGRATION_TESTS === 'true'
const describeIfEnabled = runIntegrationTests ? describe : describe.skip

describeIfEnabled('Cache integration', () => {
  const testKeys = new Set()
  let redis
  const trackKey = (key) => {
    testKeys.add(key)
    return key
  }

  beforeAll(async () => {
    redis = await connectRedis()
  })
  beforeEach(async () => {
    for (const key of testKeys) await redis.del(key)
    testKeys.clear()
  })
  afterAll(async () => {
    for (const key of testKeys) await redis.del(key)
    await disconnectRedis()
  })

  it('connects to Redis and executes commands', async () => {
    expect(redis).toBe(getRedisClient())
    expect(redis.isOpen).toBe(true)
    expect(await redis.ping()).toBe('PONG')
  })
  it('persists values and enforces expiration', async () => {
    const key = trackKey(`integration:redis:${Date.now()}:${Math.random()}`)
    await redis.set(key, 'integration-value', { EX: 60 })
    expect(await redis.get(key)).toBe('integration-value')
    expect(await redis.ttl(key)).toBeGreaterThan(0)
  })
  it('stores and resolves access-control permissions through Redis sets', async () => {
    const userId = `integration-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const key = trackKey(getPermissionCacheKey(userId))
    const permissions = ['users:read', 'users:create']
    await cacheUserPermissions(userId, permissions)
    expect(await hasCachedPermission(userId, 'users', 'read')).toBe(true)
    expect(await hasCachedPermission(userId, 'users', 'create')).toBe(true)
    expect(await hasCachedPermission(userId, 'users', 'delete')).toBe(false)
    expect(await redis.sMembers(key)).toEqual(expect.arrayContaining(permissions))
    expect(await redis.ttl(key)).toBeGreaterThan(0)
    expect(await redis.ttl(key)).toBeLessThanOrEqual(PERMISSION_CACHE_TTL)
  })
  it('returns null for a permission cache that does not exist', async () => {
    const userId = `missing-${Date.now()}-${Math.random().toString(36).slice(2)}`
    expect(await hasCachedPermission(userId, 'users', 'read')).toBeNull()
  })
  it('replaces an existing permission cache without retaining stale members', async () => {
    const userId = `replace-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const key = trackKey(getPermissionCacheKey(userId))
    await cacheUserPermissions(userId, ['users:read', 'users:create'])
    await cacheUserPermissions(userId, ['users:read'])
    expect(await hasCachedPermission(userId, 'users', 'read')).toBe(true)
    expect(await hasCachedPermission(userId, 'users', 'create')).toBe(false)
    expect(await redis.sMembers(key)).toEqual(['users:read'])
  })
  it('invalidates a user permission cache', async () => {
    const userId = `invalidate-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const key = trackKey(getPermissionCacheKey(userId))
    await cacheUserPermissions(userId, ['users:read'])
    expect(await redis.exists(key)).toBe(1)
    await invalidateUserPermissionCache(userId)
    expect(await redis.exists(key)).toBe(0)
    expect(await hasCachedPermission(userId, 'users', 'read')).toBeNull()
  })
  it('does not leave stale permissions when caching an empty permission set', async () => {
    const userId = `empty-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const key = trackKey(getPermissionCacheKey(userId))
    await cacheUserPermissions(userId, ['users:read'])
    await cacheUserPermissions(userId, [])
    expect(await redis.exists(key)).toBe(0)
    expect(await hasCachedPermission(userId, 'users', 'read')).toBeNull()
  })
})
