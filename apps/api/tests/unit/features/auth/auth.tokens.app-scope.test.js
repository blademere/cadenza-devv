import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { env } from '../../../../src/config/index.js'
import { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../../../src/features/auth/auth.tokens.js'

describe('JWT application scope', () => {
  const user = { id: 42, authVersion: 7 }

  it('includes appId in an app-scoped access token', () => {
    const token = createAccessToken(user, 'app-obo')
    const payload = verifyAccessToken(token)

    expect(payload).toMatchObject({
      sub: '42',
      type: 'access',
      authVersion: 7,
      appId: 'app-obo',
    })
  })

  it('does not add an appId to legacy global access tokens', () => {
    const token = createAccessToken(user)
    const payload = verifyAccessToken(token)

    expect(payload).not.toHaveProperty('appId')
  })

  it('includes appId in refresh tokens so rotation can preserve application context', () => {
    const token = createRefreshToken(user, 'refresh-1', 'app-obo')
    const payload = verifyRefreshToken(token)

    expect(payload).toMatchObject({
      sub: '42',
      type: 'refresh',
      tokenId: 'refresh-1',
      authVersion: 7,
      appId: 'app-obo',
    })
  })

  it('rejects invalid application claim input before signing', () => {
    expect(() => createAccessToken(user, 123)).toThrow('Application id must be a string.')
    expect(() => createAccessToken(user, ' '.repeat(129))).toThrow('Application id is invalid.')
  })

  it('uses the configured JWT issuer and audience', () => {
    const token = createAccessToken(user, 'app-obo')
    const payload = jwt.decode(token)

    expect(payload).toMatchObject({
      iss: 'express-app',
      aud: 'api',
    })
    expect(env.JWT_ACCESS_SECRET).toBeTruthy()
  })
})
