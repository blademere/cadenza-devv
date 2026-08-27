import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = {
  findOAuthAccount: vi.spyOn(authRepository, 'findOAuthAccount'),
  findUserByEmail: vi.spyOn(authRepository, 'findUserByEmail'),
  findUserById: vi.spyOn(authRepository, 'findUserById'),
  createOAuthUser: vi.spyOn(authRepository, 'createOAuthUser'),
  createRefreshTokenRecord: vi.spyOn(
    authRepository,
    'createRefreshTokenRecord'
  ),
  createRefreshTokenRecord: vi.spyOn(
    authRepository,
    'createRefreshTokenRecord'
  ),
  linkOAuthAccount: vi.spyOn(authRepository, 'linkOAuthAccount'),
  listOAuthAccounts: vi.spyOn(authRepository, 'listOAuthAccounts'),
  unlinkOAuthAccount: vi.spyOn(authRepository, 'unlinkOAuthAccount'),
  createAccessToken: vi.fn(),
  createRefreshToken: vi.fn(),
  publish: vi.fn(),
  getProviderConfig: vi.fn(),
}

vi.mock('../../src/features/auth/auth.tokens', () => ({
  createAccessToken: mocks.createAccessToken,
  createRefreshToken: mocks.createRefreshToken,
}))

vi.mock('../../src/config', () => ({
  env: {
    OAUTH_DEFAULT_ROLE_NAME: 'client',
    COOKIE_REFRESH_MAX_AGE_MS: 86_400_000,
  },
}))

vi.mock('../../src/platform/event-bus/event-bus', () => ({
  publish: mocks.publish,
}))

vi.mock('../../src/features/auth/oauth/oauth.providers', () => ({
  getProviderConfig: mocks.getProviderConfig,
}))

const {
  linkOAuthAccountWithCode,
  unlinkOAuthAccount,
} = require('../../src/features/auth/oauth/oauth.service.js')

describe('OAuth audit events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getProviderConfig.mockReturnValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      callbackUrl: 'https://api.example.test/oauth/callback/google',
      tokenUrl: 'https://oauth.example.test/token',
    })
    mocks.publish.mockResolvedValue(undefined)
    mocks.createRefreshTokenRecord.mockResolvedValue(undefined)
    globalThis.fetch = vi.fn()
  })

  it('publishes auth.oauth_link only after a new OAuth account is linked', async () => {
    mocks.findUserById.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      isActive: true,
    })
    mocks.findOAuthAccount.mockResolvedValue(null)
    mocks.findUserByEmail.mockResolvedValue(null)
    mocks.linkOAuthAccount.mockResolvedValue({
      account: { userId: 7 },
      user: { id: 7, email: 'user@example.com', isActive: true },
    })
    mocks.linkOAuthAccount.mockResolvedValue({
      account: { userId: 7 },
      user: { id: 7, email: 'user@example.com', isActive: true },
    })
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ access_token: 'provider-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            sub: 'google-123',
            email: 'USER@example.com',
            email_verified: true,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ access_token: 'provider-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            sub: 'google-123',
            email: 'USER@example.com',
            email_verified: true,
          }),
      })

    await expect(
      linkOAuthAccountWithCode({
        userId: 7,
        provider: 'google',
        code: 'authorization-code',
        codeVerifier: 'a'.repeat(43),
      })
    ).resolves.toEqual({ provider: 'google', alreadyLinked: false })
    await expect(
      linkOAuthAccountWithCode({
        userId: 7,
        provider: 'google',
        code: 'authorization-code',
        codeVerifier: 'a'.repeat(43),
      })
    ).resolves.toEqual({ provider: 'google', alreadyLinked: false })

    expect(mocks.linkOAuthAccount).toHaveBeenCalledWith({
      userId: 7,
      provider: 'google',
      providerAccountId: 'google-123',
    })
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.oauth_link',
        entityType: 'User',
        entityId: 7,
        actorId: 7,
        context: expect.objectContaining({ oauth: { provider: 'google' } }),
      })
    )
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.oauth_link',
        entityType: 'User',
        entityId: 7,
        actorId: 7,
        context: expect.objectContaining({ oauth: { provider: 'google' } }),
      })
    )
  })

  it('does not emit an OAuth-link audit event when the account was already linked', async () => {
    mocks.findUserById.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      isActive: true,
    })
    mocks.findOAuthAccount.mockResolvedValue({ userId: 7 })
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ access_token: 'provider-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            sub: 'google-123',
            email: 'USER@example.com',
            email_verified: true,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ access_token: 'provider-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            sub: 'google-123',
            email: 'USER@example.com',
            email_verified: true,
          }),
      })

    await expect(
      linkOAuthAccountWithCode({
        userId: 7,
        provider: 'google',
        code: 'authorization-code',
        codeVerifier: 'a'.repeat(43),
      })
    ).resolves.toEqual({ provider: 'google', alreadyLinked: true })
    await expect(
      linkOAuthAccountWithCode({
        userId: 7,
        provider: 'google',
        code: 'authorization-code',
        codeVerifier: 'a'.repeat(43),
      })
    ).resolves.toEqual({ provider: 'google', alreadyLinked: true })

    expect(mocks.publish).not.toHaveBeenCalled()
    expect(mocks.linkOAuthAccount).not.toHaveBeenCalled()
  })

  it('publishes auth.oauth_unlink after the OAuth account is successfully unlinked', async () => {
    mocks.unlinkOAuthAccount.mockResolvedValue(undefined)

    await expect(
      unlinkOAuthAccount({ userId: 7, provider: 'facebook' })
    ).resolves.toEqual({ provider: 'facebook' })
    await expect(
      unlinkOAuthAccount({ userId: 7, provider: 'facebook' })
    ).resolves.toEqual({ provider: 'facebook' })

    expect(mocks.unlinkOAuthAccount).toHaveBeenCalledWith({
      userId: 7,
      provider: 'facebook',
    })
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.oauth_unlink',
        entityType: 'User',
        entityId: 7,
        actorId: 7,
        context: expect.objectContaining({ oauth: { provider: 'facebook' } }),
      })
    )
    expect(mocks.unlinkOAuthAccount).toHaveBeenCalledWith({
      userId: 7,
      provider: 'facebook',
    })
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.oauth_unlink',
        entityType: 'User',
        entityId: 7,
        actorId: 7,
        context: expect.objectContaining({ oauth: { provider: 'facebook' } }),
      })
    )
  })
})
