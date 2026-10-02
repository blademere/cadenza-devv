import { describe, expect, it, vi, beforeEach } from 'vitest'

const authRepository = {
  findUserAuthState: vi.fn(),
}

const actorContext = {
  setActorContext: vi.fn(),
}

vi.mock('../../../../src/features/auth/auth.repository.js', () => authRepository)
vi.mock('../../../../src/platform/context/index.js', () => actorContext)

const { createAccessToken, verifyAccessToken } = await import('../../../../src/features/auth/auth.tokens.js')
const { default: authenticate } = await import('../../../../src/features/auth/authenticate.secure.js')

const user = { id: 42, authVersion: 7 }

describe('app-scoped authentication', () => {
  beforeEach(() => vi.clearAllMocks())

  it('embeds the selected application in the signed access token', () => {
    const token = createAccessToken(user, 'app-obo')
    const payload = verifyAccessToken(token)

    expect(payload).toMatchObject({
      sub: '42',
      type: 'access',
      authVersion: 7,
      appId: 'app-obo',
    })
  })

  it('does not create an application claim when no application is selected', () => {
    const token = createAccessToken(user)
    const payload = verifyAccessToken(token)

    expect(payload.appId).toBeUndefined()
  })

  it('accepts a valid user and app-scoped token when authVersion matches', async () => {
    authRepository.findUserAuthState.mockResolvedValue({ id: 42, isActive: true, authVersion: 7 })

    const token = createAccessToken(user, 'app-obo')
    const req = { headers: { authorization: `Bearer ${token}` } }
    const next = vi.fn()

    await authenticate(req, {}, next)

    expect(req.user).toEqual({ id: 42 })
    expect(req.auth).toMatchObject({ appId: 'app-obo', authVersion: 7 })
    expect(actorContext.setActorContext).toHaveBeenCalledWith({ actorId: 42, actorType: 'user' })
    expect(next).toHaveBeenCalledWith()
  })

  it('revokes an otherwise valid token after authVersion changes', async () => {
    authRepository.findUserAuthState.mockResolvedValue({ id: 42, isActive: true, authVersion: 8 })

    const token = createAccessToken(user, 'app-obo')
    const req = { headers: { authorization: `Bearer ${token}` } }
    const next = vi.fn()

    await authenticate(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      message: 'Access token has been revoked.',
    }))
    expect(req.user).toBeUndefined()
  })

  it('revokes an otherwise valid token when the user is inactive', async () => {
    authRepository.findUserAuthState.mockResolvedValue({ id: 42, isActive: false, authVersion: 7 })

    const token = createAccessToken(user, 'app-obo')
    const req = { headers: { authorization: `Bearer ${token}` } }
    const next = vi.fn()

    await authenticate(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      message: 'Access token has been revoked.',
    }))
  })

  it('rejects expired access tokens before establishing identity', async () => {
    const jwt = await import('jsonwebtoken')
    const { env } = await import('../../../../src/config/index.js')
    const token = jwt.default.sign(
      { type: 'access', authVersion: 7, appId: 'app-obo', exp: Math.floor(Date.now() / 1000) - 60 },
      env.JWT_ACCESS_SECRET,
      { subject: '42', issuer: 'cadenza-app', audience: 'api' },
    )
    const req = { headers: { authorization: `Bearer ${token}` } }
    const next = vi.fn()

    await authenticate(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      message: 'Access token is invalid or expired.',
    }))
    expect(authRepository.findUserAuthState).not.toHaveBeenCalled()
  })
})
