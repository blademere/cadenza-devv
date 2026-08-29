import { describe, expect, it, vi, beforeEach } from 'vitest'

const redis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}

const connectRedis = vi.fn(async () => redis)
const cache = require('../../../src/common/middleware/cache').createCache({ connectRedis })

describe('generic API cache middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redis.get.mockResolvedValue(null)
    redis.set.mockResolvedValue('OK')
    redis.del.mockResolvedValue(1)
    connectRedis.mockResolvedValue(redis)
  })

  it('uses a caller-provided cache key and defaults to GET/HEAD', async () => {
    const next = vi.fn()
    const req = { method: 'GET', originalUrl: '/users/1', params: { id: '1' } }
    const res = { set: vi.fn(), once: vi.fn(), send: vi.fn(), json: vi.fn() }

    await cache({ key: (request) => `users:${request.params.id}`, ttlSeconds: 60 })(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.cache).toEqual(expect.objectContaining({ ttlSeconds: 60 }))
    expect(connectRedis).toHaveBeenCalledOnce()
    expect(redis.get).toHaveBeenCalledOnce()
    expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS')
  })

  it('replays a cached response and marks it as a hit', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      statusCode: 200,
      contentType: 'application/json; charset=utf-8',
      body: { success: true, data: { id: 1 } },
    }))

    const next = vi.fn()
    const res = {
      set: vi.fn(),
      status: vi.fn(function status(code) { this.statusCode = code; return this }),
      send: vi.fn(),
    }
    res.statusCode = 200

    await cache({ key: () => 'users:1' })({ method: 'GET', originalUrl: '/users/1' }, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.set).toHaveBeenCalledWith('X-Cache', 'HIT')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({ success: true, data: { id: 1 } })
  })

  it('does not cache non-cacheable methods by default', async () => {
    const next = vi.fn()
    await cache({ key: () => 'users:1' })({ method: 'POST', originalUrl: '/users' }, {}, next)

    expect(next).toHaveBeenCalledOnce()
    expect(connectRedis).not.toHaveBeenCalled()
  })

  it('honors varyByUser when generating the cache key', async () => {
    const next = vi.fn()
    const req = { method: 'GET', originalUrl: '/me', user: { id: 42 } }
    const res = { set: vi.fn(), once: vi.fn(), send: vi.fn(), json: vi.fn() }

    await cache({ key: () => 'me', varyByUser: true })(req, res, next)

    const requestedKey = redis.get.mock.calls[0][0]
    expect(requestedKey).toBe(cache.hashKey('me:user:42'))
  })

  it('fails open when Redis is unavailable', async () => {
    connectRedis.mockRejectedValueOnce(new Error('Redis unavailable'))
    const next = vi.fn()
    const req = { method: 'GET', originalUrl: '/health' }

    await cache({ key: () => 'health' })(req, {}, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.cacheError).toBeInstanceOf(Error)
  })

  it('invalidates a cache key', async () => {
    await cache.invalidate('users:1')
    expect(redis.del).toHaveBeenCalledWith(cache.hashKey('users:1'))
  })

  it('rejects an empty cache key', () => {
    expect(() => cache.normalizeKey('')).toThrow(/Cache key must not be empty/)
  })

  it('limits TTL to the configured maximum', () => {
    expect(cache.normalizeTtl(99999999)).toBe(cache.MAX_TTL_SECONDS)
  })
})
