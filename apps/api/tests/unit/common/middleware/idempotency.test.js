import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/infrastructure/cache/redis.js', () => ({
  connectRedis: vi.fn(),
}))

const { connectRedis } = await import('../../../../src/infrastructure/cache/redis.js')
const { idempotency } = await import('../../../../src/common/middleware/idempotency.js')

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

describe('idempotency middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a key by default', async () => {
    const redis = { set: vi.fn(), get: vi.fn(), eval: vi.fn() }
    connectRedis.mockResolvedValue(redis)
    const req = createRequest({ key: undefined })
    const res = createResponse()
    const next = vi.fn()

    await idempotency()(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 409 })
    expect(redis.set).not.toHaveBeenCalled()
  })

  it('creates an isolated Redis key for organization, user, route, method, and key', () => {
    const req = createRequest()
    const redisKey = idempotency.buildRedisKey({ req, key: 'same-key', scope: 'orders' })

    expect(redisKey).toMatch(/^idempotency:orders:7:42:POST:\/resources:/)
    expect(redisKey).not.toContain('same-key')
  })

  it('claims a key atomically and stores the request fingerprint', async () => {
    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      eval: vi.fn(),
    }
    connectRedis.mockResolvedValue(redis)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await idempotency({ scope: 'orders', ttlSeconds: 60 })(req, res, next)

    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('idempotency:orders:7:42:POST:/resources:'),
      expect.stringContaining('"status":"IN_PROGRESS"'),
      expect.objectContaining({ NX: true, EX: 300 }),
    )
    expect(req.idempotency).toMatchObject({ key: 'test-key' })
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects concurrent reuse while the original request is in progress', async () => {
    const redis = {
      set: vi.fn().mockResolvedValue(null),
      get: vi.fn().mockResolvedValue(
        JSON.stringify({ status: 'IN_PROGRESS', requestHash: idempotency.hashRequest(createRequest()) }),
      ),
      eval: vi.fn(),
    }
    connectRedis.mockResolvedValue(redis)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await idempotency()(req, res, next)

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 409 })
    expect(next.mock.calls[0][0].message).toContain('already in progress')
  })

  it('rejects reuse of a key for a different request fingerprint', async () => {
    const redis = {
      set: vi.fn().mockResolvedValue(null),
      get: vi.fn().mockResolvedValue(
        JSON.stringify({
          status: 'IN_PROGRESS',
          requestHash: idempotency.hashRequest(createRequest({ body: { value: 'original' } })),
        }),
      ),
      eval: vi.fn(),
    }
    connectRedis.mockResolvedValue(redis)
    const req = createRequest({ body: { value: 'different' } })
    const res = createResponse()
    const next = vi.fn()

    await idempotency()(req, res, next)

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 409 })
    expect(next.mock.calls[0][0].message).toContain('different request')
  })

  it('replays a completed response without executing the handler', async () => {
    const redis = {
      set: vi.fn(),
      get: vi.fn().mockResolvedValue(
        JSON.stringify({
          status: 'COMPLETED',
          requestHash: idempotency.hashRequest(createRequest()),
          statusCode: 201,
          contentType: 'application/json; charset=utf-8',
          body: { id: 123 },
        }),
      ),
      eval: vi.fn(),
    }
    connectRedis.mockResolvedValue(redis)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await idempotency()(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalledWith({ id: 123 })
    expect(res.headers['Idempotency-Replayed']).toBe('true')
    expect(next).not.toHaveBeenCalled()
  })

  it('finalizes only when the request still owns the claim', async () => {
    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      eval: vi.fn().mockResolvedValue(1),
    }
    connectRedis.mockResolvedValue(redis)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await idempotency({ ttlSeconds: 60 })(req, res, next)
    res.json({ ok: true })
    res.emit('finish')
    await Promise.resolve()
    await Promise.resolve()

    expect(redis.eval).toHaveBeenCalledTimes(1)
    expect(redis.eval.mock.calls[0][1]).toMatchObject({
      keys: [req.idempotency.redisKey],
      arguments: [req.idempotency.claimToken, expect.any(String), '60'],
    })
  })

  it('releases the claim after a server error so the client can retry', async () => {
    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      eval: vi.fn().mockResolvedValue(1),
    }
    connectRedis.mockResolvedValue(redis)
    const req = createRequest()
    const res = createResponse()
    const next = vi.fn()

    await idempotency()(req, res, next)
    res.statusCode = 500
    res.json({ error: 'failed' })
    res.emit('finish')
    await Promise.resolve()
    await Promise.resolve()

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('DEL', KEYS[1])"),
      {
        keys: [req.idempotency.redisKey],
        arguments: [req.idempotency.claimToken],
      },
    )
  })
})
