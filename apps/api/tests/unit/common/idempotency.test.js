import { describe, expect, it } from 'vitest'
import idempotency from '../../../src/common/middleware/idempotency.js'

describe('generic idempotency middleware', () => {
  it('builds a scoped Redis key for the authenticated user', () => {
    const req = {
      user: { id: 42 },
      method: 'POST',
      route: { path: '/orders' },
    }

    expect(
      idempotency.buildRedisKey({
        req,
        key: 'order-123',
        scope: 'orders',
      }),
    ).toBe('idempotency:orders:42:POST:/orders:order-123')
  })

  it('isolates anonymous requests from authenticated requests', () => {
    const req = {
      method: 'POST',
      route: { path: '/orders' },
    }

    expect(
      idempotency.buildRedisKey({ req, key: 'same-key' }),
    ).toContain('idempotency:api:anonymous:POST:/orders:')
  })

  it('produces the same request hash for equivalent requests', () => {
    const first = {
      method: 'POST',
      originalUrl: '/api/v1/orders',
      body: { itemId: 1, quantity: 2 },
    }
    const second = {
      method: 'POST',
      originalUrl: '/api/v1/orders',
      body: { itemId: 1, quantity: 2 },
    }

    expect(idempotency.hashRequest(first)).toBe(idempotency.hashRequest(second))
  })

  it('produces a different request hash when the body changes', () => {
    const first = {
      method: 'POST',
      originalUrl: '/api/v1/orders',
      body: { itemId: 1, quantity: 2 },
    }
    const second = {
      method: 'POST',
      originalUrl: '/api/v1/orders',
      body: { itemId: 1, quantity: 3 },
    }

    expect(idempotency.hashRequest(first)).not.toBe(idempotency.hashRequest(second))
  })

  it('parses valid stored idempotency entries', () => {
    expect(idempotency.parseEntry('{"status":"COMPLETED"}')).toEqual({
      status: 'COMPLETED',
    })
  })

  it('returns null for invalid stored entries', () => {
    expect(idempotency.parseEntry('not-json')).toBeNull()
    expect(idempotency.parseEntry(null)).toBeNull()
  })
})
