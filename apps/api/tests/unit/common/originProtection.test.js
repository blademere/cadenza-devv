import { beforeAll, describe, expect, it, vi } from 'vitest'
import originProtection from '../../../src/common/middleware/originProtection.js'
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

beforeAll(() => {})

describe('originProtection', () => {
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
