import crypto from 'node:crypto'
import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  AUTH_RATE_WINDOW_MS,
  LOGIN_RATE_LIMIT,
  normalizeIdentity,
  hashIdentity,
  getAccountIdentity,
  loginAccountKeyGenerator,
  loginAccountRateLimiterOptions,
} = require('../../../src/common/middleware/authRateLimiter')

const redis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}

const connectRedis = vi.fn(async () => redis)
const cache = require('../../../src/common/middleware/cache').createCache({ connectRedis })

import idempotency from '../../../src/common/middleware/idempotency.js'

vi.mock('../../../src/infrastructure/cache/redis.js', () => ({
  connectRedis: vi.fn(),
}))

const { connectRedis: idempotencyConnectRedis } = await import('../../../src/infrastructure/cache/redis.js')
const { idempotency: middlewareIdempotency } = await import('../../../src/common/middleware/idempotency.js')

import { ForbiddenError } from '../../../src/common/errors/appError.js'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-key-minimum-32-characters'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-minimum-32-characters'
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m'
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
process.env.COOKIE_REFRESH_MAX_AGE_MS = process.env.COOKIE_REFRESH_MAX_AGE_MS || '604800000'
process.env.CORS_ORIGIN = 'http://localhost:5173,http://localhost:4173'
process.env.COOKIE_SECURE = 'false'
process.env.COOKIE_SAME_SITE = 'lax'

const { default: originProtection } = await import('../../../src/common/middleware/originProtection.js')

const createRequest = ({
  method = 'POST',
  key = 'test-key',
  body = { value: 'one' },
  user = { id: 42, organizationId: 7 },
  route = '/resources',
} = {}) => ({
  method,
  originalUrl: route,
  path: route,
  route: { path: route },
  body,
  user,
  organizationId: undefined,
  get: vi.fn((header) => (header === 'Idempotency-Key' ? key : undefined)),
})

const createResponse = () => {
  const response = new EventEmitter()
  response.statusCode = 200
  response.headers = {}
  response.status = vi.fn((statusCode) => {
    response.statusCode = statusCode
    return response
  })
  response.set = vi.fn((name, value) => {
    response.headers[name] = value
    return response
  })
  response.get = vi.fn((name) => response.headers[name])
  response.send = vi.fn((body) => {
    response.body = body
    return response
  })
  response.json = vi.fn((body) => {
    response.body = body
    return response
  })
  return response
}

describe('rate limiting', () => {
  it('normalizes account identities consistently', () => {
    expect(normalizeIdentity('  User@Example.COM ')).toBe('user@example.com')
    expect(getAccountIdentity({ body: { email: '  User@Example.COM ' } })).toBe('user@example.com')
  })

  it('does not expose the account identifier in the Redis key', () => {
    const identity = 'user@example.com'
    const key = loginAccountKeyGenerator({
      body: { email: ` ${identity.toUpperCase()} ` },
      ip: '203.0.113.10',
    })

    expect(key).toBe(hashIdentity(identity))
    expect(key).not.toContain(identity)
  })

  it('falls back to the client IP when no account identity is available', () => {
    expect(loginAccountKeyGenerator({ body: {}, ip: '203.0.113.10' })).toBe('203.0.113.10')
  })

  it('uses the same failed-login threshold and window as the IP limiter', () => {
    expect(loginAccountRateLimiterOptions.limit).toBe(LOGIN_RATE_LIMIT)
    expect(loginAccountRateLimiterOptions.windowMs).toBe(AUTH_RATE_WINDOW_MS)
    expect(loginAccountRateLimiterOptions.skipSuccessfulRequests).toBe(true)
    expect(loginAccountRateLimiterOptions.keyGenerator).toBe(loginAccountKeyGenerator)
  })
})

describe('cache', () => {
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
      etag: 'W/"roles-123"',
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
    expect(res.set).toHaveBeenCalledWith('ETag', 'W/"roles-123"')
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

describe('idempotency', () => {
  it('builds a scoped Redis key for the authenticated user', () => {
    const req = {
      user: { id: 42 },
      method: 'POST',
      route: { path: '/orders' },
    }
    const keyDigest = crypto.createHash('sha256').update('order-123').digest('hex')

    expect(
      idempotency.buildRedisKey({ req, key: 'order-123', scope: 'orders' }),
    ).toBe(`idempotency:orders:global:42:POST:/orders:${keyDigest}`)
  })

  it('isolates anonymous requests from authenticated requests', () => {
    const req = { method: 'POST', route: { path: '/orders' } }

    expect(idempotency.buildRedisKey({ req, key: 'same-key' }))
      .toContain('idempotency:api:global:anonymous:POST:/orders:')
  })

  it('produces the same request hash for equivalent requests', () => {
    const first = { method: 'POST', originalUrl: '/api/v1/orders', body: { itemId: 1, quantity: 2 } }
    const second = { method: 'POST', originalUrl: '/api/v1/orders', body: { itemId: 1, quantity: 2 } }

    expect(idempotency.hashRequest(first)).toBe(idempotency.hashRequest(second))
  })

  it('produces a different request hash when the body changes', () => {
    const first = { method: 'POST', originalUrl: '/api/v1/orders', body: { itemId: 1, quantity: 2 } }
    const second = { method: 'POST', originalUrl: '/api/v1/orders', body: { itemId: 1, quantity: 3 } }

    expect(idempotency.hashRequest(first)).not.toBe(idempotency.hashRequest(second))
  })

  it('parses valid stored idempotency entries', () => {
    expect(idempotency.parseEntry('{"status":"COMPLETED"}')).toEqual({ status: 'COMPLETED' })
  })

  it('returns null for invalid stored entries', () => {
    expect(idempotency.parseEntry('not-json')).toBeNull()
    expect(idempotency.parseEntry(null)).toBeNull()
  })

  it('requires a key by default', async () => {
    const redisClient = { set: vi.fn(), get: vi.fn(), eval: vi.fn() }
    idempotencyConnectRedis.mockResolvedValue(redisClient)
    const req = createRequest({ key: null })
    const res = createResponse()
    const next = vi.fn()

    await middlewareIdempotency()(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 409 })
    expect(redisClient.set).not.toHaveBeenCalled()
  })

  it('creates an isolated Redis key for organization, user, route, method, and key', () => {
    const req = createRequest()
    const redisKey = middlewareIdempotency.buildRedisKey({ req, key: 'same-key', scope: 'orders' })

    expect(redisKey).toMatch(/^idempotency:orders:7:42:POST:\/resources:/)
    expect(redisKey).not.toContain('same-key')
  })

  it('claims a key atomically and stores the request fingerprint', async () => {
    const redisClient = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      eval: vi.fn(),
    }
    idempotencyConnectRedis.mockResolvedValue(redisClient)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await middlewareIdempotency({ scope: 'orders', ttlSeconds: 60 })(req, res, next)

    expect(redisClient.set).toHaveBeenCalledWith(
      expect.stringContaining('idempotency:orders:7:42:POST:/resources:'),
      expect.stringContaining('"status":"IN_PROGRESS"'),
      expect.objectContaining({ NX: true, EX: 300 }),
    )
    expect(req.idempotency).toMatchObject({ key: 'test-key' })
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects concurrent reuse while the original request is in progress', async () => {
    const redisClient = {
      set: vi.fn().mockResolvedValue(null),
      get: vi.fn().mockResolvedValue(
        JSON.stringify({ status: 'IN_PROGRESS', requestHash: middlewareIdempotency.hashRequest(createRequest()) }),
      ),
      eval: vi.fn(),
    }
    idempotencyConnectRedis.mockResolvedValue(redisClient)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await middlewareIdempotency()(req, res, next)

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 409 })
    expect(next.mock.calls[0][0].message).toContain('already in progress')
  })

  it('rejects reuse of a key for a different request fingerprint', async () => {
    const redisClient = {
      set: vi.fn().mockResolvedValue(null),
      get: vi.fn().mockResolvedValue(
        JSON.stringify({
          status: 'IN_PROGRESS',
          requestHash: middlewareIdempotency.hashRequest(createRequest({ body: { value: 'original' } })),
        }),
      ),
      eval: vi.fn(),
    }
    idempotencyConnectRedis.mockResolvedValue(redisClient)
    const req = createRequest({ body: { value: 'different' } })
    const res = createResponse()
    const next = vi.fn()

    await middlewareIdempotency()(req, res, next)

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 409 })
    expect(next.mock.calls[0][0].message).toContain('different request')
  })

  it('replays a completed response without executing the handler', async () => {
    const redisClient = {
      set: vi.fn(),
      get: vi.fn().mockResolvedValue(
        JSON.stringify({
          status: 'COMPLETED',
          requestHash: middlewareIdempotency.hashRequest(createRequest()),
          statusCode: 201,
          contentType: 'application/json; charset=utf-8',
          body: { id: 123 },
        }),
      ),
      eval: vi.fn(),
    }
    idempotencyConnectRedis.mockResolvedValue(redisClient)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await middlewareIdempotency()(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalledWith({ id: 123 })
    expect(res.headers['Idempotency-Replayed']).toBe('true')
    expect(next).not.toHaveBeenCalled()
  })

  it('finalizes only when the request still owns the claim', async () => {
    const redisClient = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      eval: vi.fn().mockResolvedValue(1),
    }
    idempotencyConnectRedis.mockResolvedValue(redisClient)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await middlewareIdempotency({ ttlSeconds: 60 })(req, res, next)
    res.json({ ok: true })
    res.emit('finish')
    await Promise.resolve()
    await Promise.resolve()

    expect(redisClient.eval).toHaveBeenCalledTimes(1)
    expect(redisClient.eval.mock.calls[0][1]).toMatchObject({
      keys: [req.idempotency.redisKey],
      arguments: [req.idempotency.claimToken, expect.any(String), '60'],
    })
  })

  it('releases the claim after a server error so the client can retry', async () => {
    const redisClient = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      eval: vi.fn().mockResolvedValue(1),
    }
    idempotencyConnectRedis.mockResolvedValue(redisClient)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await middlewareIdempotency()(req, res, next)
    res.statusCode = 500
    res.json({ error: 'failed' })
    res.emit('finish')
    await Promise.resolve()
    await Promise.resolve()

    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('DEL', KEYS[1])"),
      { keys: [req.idempotency.redisKey], arguments: [req.idempotency.claimToken] },
    )
  })
})

describe('origin protection', () => {
  it('allows state-changing requests from an explicitly configured origin', () => {
    const next = vi.fn()
    originProtection({ method: 'POST', get: () => 'http://localhost:5173' }, {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects state-changing requests from an untrusted origin', () => {
    const next = vi.fn()
    originProtection({ method: 'POST', get: () => 'https://attacker.example' }, {}, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError)
  })

  it('allows non-browser clients without an Origin header', () => {
    const next = vi.fn()
    originProtection({ method: 'POST', get: () => undefined }, {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('does not apply Origin enforcement to safe/read-only methods', () => {
    const next = vi.fn()
    originProtection({ method: 'GET', get: () => 'https://attacker.example' }, {}, next)
    expect(next).toHaveBeenCalledWith()
  })
})

describe('pagination', () => {
  const {
    normalizePagination,
    createPaginationMeta,
    createOrderBy,
    pickFilters,
  } = require('../../../src/common/pagination/pagination')

  it('normalizes page and limit with safe defaults and maximum', () => {
    expect(normalizePagination({})).toEqual({ page: 1, limit: 20, skip: 0, take: 20 })
    expect(normalizePagination({ page: '3', limit: '500' })).toEqual({ page: 3, limit: 100, skip: 200, take: 100 })
  })

  it('builds pagination metadata', () => {
    expect(createPaginationMeta({ page: 2, limit: 20, total: 45 })).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      pages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  it('whitelists sortable fields and sort direction', () => {
    expect(createOrderBy({ sortBy: 'email', sortOrder: 'asc' }, ['createdAt', 'email'], 'createdAt')).toEqual({ email: 'asc' })
    expect(createOrderBy({ sortBy: 'passwordHash', sortOrder: 'invalid' }, ['createdAt', 'email'], 'createdAt')).toEqual({ createdAt: 'desc' })
  })

  it('picks only explicitly allowed filters', () => {
    expect(pickFilters({ email: 'admin', isActive: 'true', passwordHash: 'secret' }, ['email', 'isActive']))
      .toEqual({ email: 'admin', isActive: 'true' })
  })
})
