import { describe, expect, it } from 'vitest'

const {
  AUTH_RATE_WINDOW_MS,
  LOGIN_RATE_LIMIT,
  normalizeIdentity,
  hashIdentity,
  getAccountIdentity,
  loginAccountKeyGenerator,
  loginAccountRateLimiterOptions,
} = require('../../../src/common/middleware/authRateLimiter')

describe('authentication rate limiting', () => {
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
