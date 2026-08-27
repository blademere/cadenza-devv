import { describe, expect, it, vi } from 'vitest'

vi.mock('express-rate-limit', () => ({
  rateLimit: vi.fn((options) => options),
}))

const {
  normalizeIdentity,
  hashIdentity,
  getAccountIdentity,
  loginAccountRateLimiter,
} = require('../../../src/common/middleware/authRateLimiter')

describe('authentication rate limiting', () => {
  it('normalizes account identities consistently', () => {
    expect(normalizeIdentity('  User@Example.COM ')).toBe('user@example.com')
    expect(getAccountIdentity({ body: { email: '  User@Example.COM ' } })).toBe('user@example.com')
  })

  it('does not expose the account identifier in the Redis key', () => {
    const identity = 'user@example.com'
    const key = loginAccountRateLimiter.keyGenerator({ body: { email: ` ${identity.toUpperCase()} ` }, ip: '203.0.113.10' })

    expect(key).toBe(hashIdentity(identity))
    expect(key).not.toContain(identity)
  })

  it('falls back to the client IP when no account identity is available', () => {
    expect(loginAccountRateLimiter.keyGenerator({ body: {}, ip: '203.0.113.10' })).toBe('203.0.113.10')
  })

  it('uses the same failed-login threshold and window as the IP limiter', () => {
    expect(loginAccountRateLimiter.limit).toBe(5)
    expect(loginAccountRateLimiter.windowMs).toBe(15 * 60 * 1000)
    expect(loginAccountRateLimiter.skipSuccessfulRequests).toBe(true)
  })
})
