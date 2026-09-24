import { describe, expect, it } from 'vitest'

import {
  createCorsOptions,
  isAllowedCorsOrigin,
  parseCorsOrigins,
} from '../../../src/config/cors.js'

describe('CORS configuration', () => {
  it('parses multiple configured origins and ignores empty values', () => {
    expect([...parseCorsOrigins(' http://localhost:5173, https://cadenza-web-rho.vercel.app, ')])
      .toEqual([
        'http://localhost:5173',
        'https://cadenza-web-rho.vercel.app',
      ])
  })

  it('allows local and deployed origins when they are explicitly configured', () => {
    const origins = parseCorsOrigins(
      'http://localhost:5173,http://127.0.0.1:5173,https://cadenza-web-rho.vercel.app'
    )

    expect(isAllowedCorsOrigin(origins, 'http://localhost:5173')).toBe(true)
    expect(isAllowedCorsOrigin(origins, 'http://127.0.0.1:5173')).toBe(true)
    expect(isAllowedCorsOrigin(origins, 'https://cadenza-web-rho.vercel.app')).toBe(true)
    expect(isAllowedCorsOrigin(origins, 'https://untrusted.example')).toBe(false)
    expect(isAllowedCorsOrigin(origins, undefined)).toBe(true)
  })

  it('reflects an allowed browser origin for credentialed requests', () => {
    const options = createCorsOptions(
      'http://localhost:5173,https://cadenza-web-rho.vercel.app'
    )

    let result
    options.origin('https://cadenza-web-rho.vercel.app', (_error, origin) => {
      result = origin
    })

    expect(result).toBe('https://cadenza-web-rho.vercel.app')
    expect(options.credentials).toBe(true)
  })

  it('does not emit an allow-origin value for an unconfigured origin', () => {
    const options = createCorsOptions('http://localhost:5173')

    let result
    options.origin('https://untrusted.example', (_error, origin) => {
      result = origin
    })

    expect(result).toBe(false)
  })
})
