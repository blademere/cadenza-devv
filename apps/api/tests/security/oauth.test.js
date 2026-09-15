import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/features/auth/auth.repository.js')
vi.mock('../../src/platform/event-bus/event-bus.js')
vi.mock('../../src/features/auth/oauth/oauth.providers.js')

const authRepository = await import('../../src/features/auth/auth.repository.js')
const eventBus = await import('../../src/platform/event-bus/event-bus.js')
const oauthProviders = await import('../../src/features/auth/oauth/oauth.providers.js')
const { linkOAuthAccountWithCode, unlinkOAuthAccount } = await import('../../src/features/auth/oauth/oauth.service.js')

const mocks = {
  findOAuthAccount: authRepository.findOAuthAccount,
  findUserByEmail: authRepository.findUserByEmail,
  findUserById: authRepository.findUserById,
  createOAuthAccount: authRepository.createOAuthAccount,
  listOAuthAccounts: authRepository.listOAuthAccounts,
  findOAuthAccountByUserAndProvider: authRepository.findOAuthAccountByUserAndProvider,
  deleteOAuthAccount: authRepository.deleteOAuthAccount,
  countOAuthAccounts: authRepository.countOAuthAccounts,
  withTransaction: authRepository.withTransaction,
  publish: eventBus.publish,
  getProviderConfig: oauthProviders.getProviderConfig,
}

describe('OAuth security and audit events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getProviderConfig.mockReturnValue({ clientId: 'client-id', clientSecret: 'client-secret', callbackUrl: 'https://api.example.test/oauth/callback/google', tokenUrl: 'https://oauth.example.test/token' })
    mocks.publish.mockResolvedValue(undefined)
    mocks.withTransaction.mockImplementation(async (callback) => callback({ transaction: true }))
    globalThis.fetch = vi.fn()
  })

  it('publishes auth.oauth_link only after a new OAuth account is linked', async () => {
    mocks.findOAuthAccount.mockResolvedValue(null)
    mocks.findUserByEmail.mockResolvedValue(null)
    mocks.findUserById.mockResolvedValue({ id: 7, email: 'user@example.com', isActive: true })
    mocks.createOAuthAccount.mockResolvedValue({ id: 'oauth-1', userId: 7 })
    globalThis.fetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'provider-token' }) }).mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ sub: 'google-123', email: 'USER@example.com', email_verified: true }) })
    await expect(linkOAuthAccountWithCode({ userId: 7, provider: 'google', code: 'authorization-code', codeVerifier: 'a'.repeat(43) })).resolves.toEqual({ provider: 'google', alreadyLinked: false })
    expect(mocks.createOAuthAccount).toHaveBeenCalledWith({ userId: 7, provider: 'google', providerAccountId: 'google-123' }, { transaction: true })
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.oauth_link', entityType: 'User', entityId: 7, actorId: 7, context: expect.objectContaining({ oauth: { provider: 'google' } }) }))
  })

  it('does not emit an OAuth-link audit event when the account was already linked', async () => {
    mocks.findOAuthAccount.mockResolvedValue({ userId: 7 })
    globalThis.fetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'provider-token' }) }).mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ sub: 'google-123', email: 'USER@example.com', email_verified: true }) })
    await expect(linkOAuthAccountWithCode({ userId: 7, provider: 'google', code: 'authorization-code', codeVerifier: 'a'.repeat(43) })).resolves.toEqual({ provider: 'google', alreadyLinked: true })
    expect(mocks.publish).not.toHaveBeenCalled()
    expect(mocks.createOAuthAccount).not.toHaveBeenCalled()
  })

  it('publishes auth.oauth_unlink after the OAuth account is successfully unlinked', async () => {
    mocks.findUserById.mockResolvedValue({ id: 7, email: 'user@example.com', isActive: true, passwordHash: 'hash' })
    mocks.findOAuthAccountByUserAndProvider.mockResolvedValue({ id: 'oauth-1', provider: 'facebook' })
    mocks.countOAuthAccounts.mockResolvedValue(1)
    mocks.deleteOAuthAccount.mockResolvedValue({ id: 'oauth-1', provider: 'facebook' })
    await expect(unlinkOAuthAccount({ userId: 7, provider: 'facebook' })).resolves.toEqual({ provider: 'facebook' })
    expect(mocks.deleteOAuthAccount).toHaveBeenCalledWith('oauth-1')
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.oauth_unlink', entityType: 'User', entityId: 7, actorId: 7, context: expect.objectContaining({ oauth: { provider: 'facebook' } }) }))
  })
})
