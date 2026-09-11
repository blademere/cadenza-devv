import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'

// Refresh/replay, email verification, password reset, and auth-service tests
// intentionally retain their existing mocks because they exercise isolated
// service boundaries rather than the HTTP/integration layer.
vi.mock('../../../src/platform/event-bus/event-bus.js')
vi.mock('../../../src/features/auth/auth.repository.js')
vi.mock('../../../src/features/auth/auth.tokens.js')
vi.mock('bcrypt')

const eventBus = await import('../../../src/platform/event-bus/event-bus.js')
const repository = await import('../../../src/features/auth/auth.repository.js')
const tokens = await import('../../../src/features/auth/auth.tokens.js')
const bcrypt = await import('bcrypt')
const { UnauthorizedError } = await import('../../../src/common/errors/appError.js')
const { refreshAccessToken, changePassword, getSessions, revokeSessionById, revokeAllSessions, requestPasswordReset, resetPassword } = await import('../../../src/features/auth/auth.service.js')
const { issueEmailVerification, verifyEmail, encryptVerificationSecret, decryptVerificationSecret } = await import('../../../src/features/auth/email-verification.service.js')
const { registerUser } = await import('../../../src/features/auth/registration.service.js')

const authRepositoryPath = new URL('../../../src/features/auth/auth.repository.js', import.meta.url)
const authTokensPath = new URL('../../../src/features/auth/auth.tokens.js', import.meta.url)
const authMaintenancePath = new URL('../../../src/infrastructure/maintenance/auth-token.js', import.meta.url)
const userServicePath = new URL('../../../src/features/users/user.service.js', import.meta.url)
const oauthServicePath = new URL('../../../src/features/auth/oauth/oauth.service.js', import.meta.url)
const readText = (url) => readFile(url, 'utf8')

const { oauthRedis, connectRedis } = vi.hoisted(() => {
  const oauthRedis = { set: vi.fn(), getDel: vi.fn() }
  const connectRedis = vi.fn(async () => oauthRedis)
  return { oauthRedis, connectRedis }
})

vi.mock('../../../src/infrastructure/cache/redis.js', () => ({ connectRedis }))
vi.mock('../../../src/config/index.js', () => ({
  env: {
    OAUTH_GOOGLE_CLIENT_ID: 'google-client',
    OAUTH_GOOGLE_CLIENT_SECRET: 'google-secret',
    OAUTH_GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/oauth/google/callback',
    OAUTH_FACEBOOK_CLIENT_ID: 'facebook-client',
    OAUTH_FACEBOOK_CLIENT_SECRET: 'facebook-secret',
    OAUTH_FACEBOOK_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/oauth/facebook/callback',
    OAUTH_FACEBOOK_API_VERSION: 'v24.0',
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax',
    COOKIE_DOMAIN: '',
  },
}))

const { createState, createPkceVerifier, createPkceChallenge, createAuthorizationUrl, safeEqual, getProviderConfig, consumeOAuthState, storeOAuthState } = await import('../../../src/features/auth/oauth/oauth.providers.js')

beforeEach(() => {
  vi.clearAllMocks()
  eventBus.publish.mockResolvedValue({ id: 'event-1' })
  repository.revokeAllRefreshTokensForUser.mockResolvedValue(undefined)
  tokens.verifyRefreshToken.mockReturnValue({ type: 'refresh', sub: '42', tokenId: 'old-token-id', authVersion: 0 })
  tokens.hashToken.mockImplementation((value) => `hash:${value}`)
  bcrypt.default.hash.mockResolvedValue('new-password-hash')
  repository.findUserByEmail.mockResolvedValue(null)
  repository.findRoleByName.mockResolvedValue({ id: 7, name: 'client', description: 'Client role' })
  repository.createUser.mockResolvedValue({ id: 100, email: 'user@example.com', role: { id: 7, name: 'client', description: 'Client role' } })
})

describe('registration', () => {
  it('creates a user with the default client role', async () => {
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).resolves.toEqual({ id: 100, email: 'user@example.com', role: { id: 7, name: 'client', description: 'Client role' } })
    expect(repository.findUserByEmail).toHaveBeenCalledWith('user@example.com')
    expect(repository.findRoleByName).toHaveBeenCalledWith('client')
    expect(bcrypt.default.hash).toHaveBeenCalledWith('password123', 12)
    expect(repository.createUser).toHaveBeenCalledWith({ email: 'user@example.com', roleId: 7, passwordHash: 'new-password-hash' })
  })

  it('rejects an existing email before hashing the password', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com' })
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow('An account with this email already exists.')
    expect(bcrypt.default.hash).not.toHaveBeenCalled()
    expect(repository.createUser).not.toHaveBeenCalled()
  })

  it('fails closed when the default role is missing', async () => {
    repository.findRoleByName.mockResolvedValue(null)
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow("The default 'client' role is not configured.")
    expect(bcrypt.default.hash).not.toHaveBeenCalled()
    expect(repository.createUser).not.toHaveBeenCalled()
  })

  it('converts a Prisma unique constraint race into a conflict error', async () => {
    repository.createUser.mockRejectedValue({ code: 'P2002' })
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow('An account with this email already exists.')
  })
})

describe('email verification', () => {
  it('encrypts verification credentials and round-trips without exposing plaintext', () => {
    const secret = 'a'.repeat(43)
    const encrypted = encryptVerificationSecret(secret)
    expect(encrypted).not.toContain(secret)
    expect(decryptVerificationSecret(encrypted)).toBe(secret)
  })

  it('issues a hashed-token-backed verification event without exposing the raw secret', async () => {
    repository.findUserById.mockResolvedValue({ id: 7, email: 'user@example.com', isActive: true, emailVerifiedAt: null })
    repository.invalidateEmailVerificationTokens.mockResolvedValue({ count: 0 })
    repository.createEmailVerificationToken.mockResolvedValue({ id: 'verification-record-1' })
    const result = await issueEmailVerification({ userId: 7 })
    const event = eventBus.publish.mock.calls[0][0]
    const createCall = repository.createEmailVerificationToken.mock.calls[0][0]
    expect(result.success).toBe(true)
    expect(createCall).toEqual(expect.objectContaining({ userId: 7, tokenHash: expect.any(String) }))
    expect(createCall.tokenHash).not.toHaveLength(0)
    expect(event.event).toBe('auth.user.email_verification_requested')
    expect(event.idempotencyKey).toBe('auth.email-verification.requested:verification-record-1')
    expect(event.context.emailVerification.url).not.toContain(createCall.tokenHash)
  })

  it('rejects replayed, expired, inactive, and already-used verification tokens', async () => {
    const token = encryptVerificationSecret('b'.repeat(43))
    repository.findEmailVerificationToken.mockResolvedValue({ id: 'verification-record-2', userId: 7, usedAt: new Date(), expiresAt: new Date(Date.now() + 60000), user: { id: 7, email: 'user@example.com', isActive: true } })
    await expect(verifyEmail({ token })).rejects.toThrow('Email verification token is invalid or expired.')
    expect(repository.consumeEmailVerificationToken).not.toHaveBeenCalled()
  })

  it('consumes a valid token atomically and publishes completion', async () => {
    const token = encryptVerificationSecret('c'.repeat(43))
    repository.findEmailVerificationToken.mockResolvedValue({ id: 'verification-record-3', userId: 7, usedAt: null, expiresAt: new Date(Date.now() + 60000), user: { id: 7, email: 'user@example.com', isActive: true } })
    repository.consumeEmailVerificationToken.mockResolvedValue({ success: true })
    await expect(verifyEmail({ token })).resolves.toEqual({ success: true })
    expect(repository.consumeEmailVerificationToken).toHaveBeenCalledWith({ tokenId: 'verification-record-3', userId: 7 })
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.user.email_verified', entityId: 7 }))
  })
})

describe('password reset', () => {
  const getPublishedResetToken = () => new URL(eventBus.publish.mock.calls[0]?.[0]?.context?.passwordReset?.url).searchParams.get('token')

  it('does not enumerate unknown accounts', async () => {
    repository.findUserByEmail.mockResolvedValue(null)
    await expect(requestPasswordReset({ email: 'missing@example.com' })).resolves.toEqual({ success: true })
    expect(repository.createPasswordResetToken).not.toHaveBeenCalled()
    expect(eventBus.publish).not.toHaveBeenCalled()
  })

  it('stores only a hash and publishes an encrypted reset link', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com', isActive: true, passwordHash: 'old-hash' })
    repository.createPasswordResetToken.mockResolvedValue({ id: 'reset-1' })
    await expect(requestPasswordReset({ email: 'user@example.com' })).resolves.toEqual({ success: true })
    const createCall = repository.createPasswordResetToken.mock.calls[0][0]
    const encryptedToken = getPublishedResetToken()
    expect(encryptedToken).toBeTruthy()
    expect(createCall.tokenHash).toEqual(expect.stringMatching(/^hash:/))
    expect(createCall.token).toBeUndefined()
    expect(eventBus.publish.mock.calls[0][0].context.passwordReset.url).toContain('token=')
    expect(eventBus.publish.mock.calls[0][0].context.passwordReset.url).not.toContain(createCall.tokenHash)
  })

  it('rejects malformed reset credentials before touching the repository', async () => {
    await expect(resetPassword({ token: 'not-a-reset-token', newPassword: 'new-password' })).rejects.toThrow('Password reset token is invalid or expired.')
    expect(repository.findPasswordResetToken).not.toHaveBeenCalled()
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled()
  })

  it('consumes the reset token and invalidates authenticated sessions', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com', isActive: true, passwordHash: 'old-hash' })
    repository.createPasswordResetToken.mockResolvedValue({ id: 'reset-1' })
    await requestPasswordReset({ email: 'user@example.com' })
    const token = getPublishedResetToken()
    repository.findPasswordResetToken.mockResolvedValue({ id: 'reset-1', userId: 42, expiresAt: new Date(Date.now() + 60000), usedAt: null, user: { id: 42, email: 'user@example.com', isActive: true } })
    repository.consumePasswordResetToken.mockResolvedValue({ success: true })
    await expect(resetPassword({ token, newPassword: 'new-password' })).resolves.toEqual({ success: true })
    expect(repository.consumePasswordResetToken).toHaveBeenCalledWith({ tokenId: 'reset-1', userId: 42, passwordHash: 'new-password-hash' })
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.user.password_reset' }))
  })

  it('rejects an expired reset token', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com', isActive: true, passwordHash: 'old-hash' })
    repository.createPasswordResetToken.mockResolvedValue({ id: 'reset-1' })
    await requestPasswordReset({ email: 'user@example.com' })
    const token = getPublishedResetToken()
    repository.findPasswordResetToken.mockResolvedValue({ id: 'reset-1', userId: 42, expiresAt: new Date(Date.now() - 1000), usedAt: null, user: { id: 42, email: 'user@example.com', isActive: true } })
    await expect(resetPassword({ token, newPassword: 'new-password' })).rejects.toThrow('Password reset token is invalid or expired.')
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled()
  })
})

describe('refresh and replay protection', () => {
  it('revokes all user refresh tokens when a revoked token is replayed', async () => {
    repository.findRefreshToken.mockResolvedValue({ id: 'old-token-id', userId: 42, revokedAt: new Date(), user: { id: 42, isActive: true, authVersion: 0 } })
    await expect(refreshAccessToken({ refreshToken: 'replayed-token' })).rejects.toBeInstanceOf(UnauthorizedError)
    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(42)
    expect(repository.findRefreshToken).toHaveBeenCalledWith('hash:replayed-token')
    expect(repository.rotateRefreshToken).not.toHaveBeenCalled()
  })

  it('revokes all user refresh tokens when atomic rotation loses a replay race', async () => {
    repository.findRefreshToken.mockResolvedValue({ id: 'old-token-id', userId: 42, revokedAt: null, expiresAt: new Date(Date.now() + 60000), user: { id: 42, isActive: true, authVersion: 0 } })
    tokens.createRefreshToken.mockReturnValue('new-refresh-token')
    tokens.createAccessToken.mockReturnValue('access-token')
    tokens.hashToken.mockReturnValueOnce('old-token-hash').mockReturnValueOnce('new-token-hash')
    repository.rotateRefreshToken.mockResolvedValue({ success: false })
    await expect(refreshAccessToken({ refreshToken: 'refresh-token' })).rejects.toBeInstanceOf(UnauthorizedError)
    expect(repository.rotateRefreshToken).toHaveBeenCalledTimes(1)
    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(42)
  })
})

describe('OAuth', () => {
  const validState = 'a'.repeat(43)
  const validVerifier = 'b'.repeat(43)

  it('creates an opaque cryptographically random state', () => {
    const state = createState()
    expect(typeof state).toBe('string')
    expect(state.length).toBeGreaterThanOrEqual(40)
    expect(createState()).not.toBe(state)
  })

  it('creates a cryptographically random PKCE verifier and deterministic S256 challenge', () => {
    const verifier = createPkceVerifier()
    const challenge = createPkceChallenge(verifier)
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(createPkceChallenge(verifier)).toBe(challenge)
    expect(createPkceChallenge(createPkceVerifier())).not.toBe(challenge)
  })

  it('creates Google and Facebook authorization URLs with state and S256 PKCE', () => {
    const verifier = createPkceVerifier()
    const challenge = createPkceChallenge(verifier)
    const google = new URL(createAuthorizationUrl('google', 'state-123', challenge))
    expect(google.hostname).toBe('accounts.google.com')
    expect(google.searchParams.get('state')).toBe('state-123')
    expect(google.searchParams.get('client_id')).toBe('google-client')
    expect(google.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/v1/auth/oauth/google/callback')
    expect(google.searchParams.get('response_type')).toBe('code')
    expect(google.searchParams.get('code_challenge')).toBe(challenge)
    expect(google.searchParams.get('code_challenge_method')).toBe('S256')

    const facebook = new URL(createAuthorizationUrl('facebook', 'state-456', challenge))
    expect(facebook.hostname).toBe('www.facebook.com')
    expect(facebook.pathname).toBe('/v24.0/dialog/oauth')
    expect(facebook.searchParams.get('state')).toBe('state-456')
    expect(facebook.searchParams.get('client_id')).toBe('facebook-client')
    expect(facebook.searchParams.get('scope')).toBe('email')
    expect(facebook.searchParams.get('code_challenge')).toBe(challenge)
    expect(facebook.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('returns provider configuration and rejects unsupported providers', () => {
    expect(getProviderConfig('google')).toMatchObject({ clientId: 'google-client', clientSecret: 'google-secret' })
    expect(getProviderConfig('facebook')).toMatchObject({ clientId: 'facebook-client', clientSecret: 'facebook-secret' })
    expect(() => getProviderConfig('github')).toThrow()
    expect(() => createAuthorizationUrl('github', 'state', 'challenge')).toThrow()
  })

  describe('safeEqual', () => {
    it('returns true for equal values', () => expect(safeEqual('same-state', 'same-state')).toBe(true))
    it('returns false for different values', () => expect(safeEqual('state-a', 'state-b')).toBe(false))
    it('returns false when a value is missing', () => {
      expect(safeEqual(undefined, 'state')).toBe(false)
      expect(safeEqual('state', undefined)).toBe(false)
      expect(safeEqual('', 'state')).toBe(false)
    })
  })

  describe('state storage', () => {
    it('stores login state atomically with NX and EX, including the PKCE verifier', async () => {
      oauthRedis.set.mockResolvedValue('OK')
      await storeOAuthState(validState, { flow: 'login', provider: 'google', codeVerifier: validVerifier }, 600000)
      expect(oauthRedis.set).toHaveBeenCalledWith(expect.stringMatching(/^oauth:state:[a-f0-9]{64}$/), JSON.stringify({ flow: 'login', provider: 'google', codeVerifier: validVerifier }), { NX: true, EX: 600 })
    })

    it('stores link state with a normalized numeric user id and PKCE verifier', async () => {
      oauthRedis.set.mockResolvedValue('OK')
      await storeOAuthState(validState, { flow: 'link', provider: 'facebook', userId: '42', codeVerifier: validVerifier }, 30000)
      expect(oauthRedis.set).toHaveBeenCalledWith(expect.any(String), JSON.stringify({ flow: 'link', provider: 'facebook', codeVerifier: validVerifier, userId: 42 }), { NX: true, EX: 30 })
    })

    it('rejects invalid state, flow, provider, verifier, and link user id input', async () => {
      await expect(storeOAuthState('short', { flow: 'login', provider: 'google', codeVerifier: validVerifier }, 600000)).rejects.toThrow('OAuth state must be a high-entropy string.')
      await expect(storeOAuthState(validState, { flow: 'unknown', provider: 'google', codeVerifier: validVerifier }, 600000)).rejects.toThrow('Invalid OAuth state flow.')
      await expect(storeOAuthState(validState, { flow: 'login', provider: 'github', codeVerifier: validVerifier }, 600000)).rejects.toThrow('Invalid OAuth state provider.')
      await expect(storeOAuthState(validState, { flow: 'login', provider: 'google' }, 600000)).rejects.toThrow('A valid PKCE code verifier is required.')
      await expect(storeOAuthState(validState, { flow: 'link', provider: 'google', codeVerifier: validVerifier }, 600000)).rejects.toThrow('A valid userId is required for OAuth linking.')
    })

    it('rejects state collisions', async () => {
      oauthRedis.set.mockResolvedValue(null)
      await expect(storeOAuthState(validState, { flow: 'login', provider: 'google', codeVerifier: validVerifier }, 600000)).rejects.toThrow('OAuth state collision detected.')
    })
  })

  describe('state consumption', () => {
    it('atomically consumes valid login and link state', async () => {
      oauthRedis.getDel.mockResolvedValue(JSON.stringify({ flow: 'login', provider: 'google', codeVerifier: validVerifier }))
      await expect(consumeOAuthState(validState, 'login', 'google')).resolves.toEqual({ flow: 'login', provider: 'google', codeVerifier: validVerifier })
      oauthRedis.getDel.mockResolvedValue(JSON.stringify({ flow: 'link', provider: 'facebook', userId: 42, codeVerifier: validVerifier }))
      await expect(consumeOAuthState(validState, 'link', 'facebook')).resolves.toEqual({ flow: 'link', provider: 'facebook', userId: 42, codeVerifier: validVerifier })
    })

    it('rejects missing, wrong-flow/provider, malformed, missing-verifier, and invalid-user-id state', async () => {
      oauthRedis.getDel.mockResolvedValue(null)
      await expect(consumeOAuthState(validState, 'login', 'google')).resolves.toBeNull()
      oauthRedis.getDel.mockResolvedValue(JSON.stringify({ flow: 'login', provider: 'google', codeVerifier: validVerifier }))
      await expect(consumeOAuthState(validState, 'link', 'google')).resolves.toBeNull()
      await expect(consumeOAuthState(validState, 'login', 'facebook')).resolves.toBeNull()
      oauthRedis.getDel.mockResolvedValue('{not-json')
      await expect(consumeOAuthState(validState, 'login', 'google')).resolves.toBeNull()
      oauthRedis.getDel.mockResolvedValue(JSON.stringify({ flow: 'login', provider: 'google' }))
      await expect(consumeOAuthState(validState, 'login', 'google')).resolves.toBeNull()
      oauthRedis.getDel.mockResolvedValue(JSON.stringify({ flow: 'link', provider: 'facebook', userId: 0, codeVerifier: validVerifier }))
      await expect(consumeOAuthState(validState, 'link', 'facebook')).resolves.toBeNull()
    })

    it('rejects invalid expected flow/provider and invalid states before Redis access', async () => {
      await expect(consumeOAuthState(validState, 'invalid', 'google')).rejects.toThrow('Invalid expected OAuth state flow.')
      await expect(consumeOAuthState(validState, 'login', 'github')).rejects.toThrow('Invalid expected OAuth state provider.')
      await expect(consumeOAuthState('short', 'login', 'google')).resolves.toBeNull()
      expect(oauthRedis.getDel).not.toHaveBeenCalled()
    })
  })
})

describe('service security', () => {
  it('changes password only after verifying the current password', async () => {
    repository.findUserById.mockResolvedValue({ id: 7, isActive: true, passwordHash: 'old-hash' })
    bcrypt.default.compare.mockResolvedValue(true)
    bcrypt.default.hash.mockResolvedValue('new-hash')
    repository.changePassword.mockResolvedValue({ id: 7, authVersion: 3 })
    await expect(changePassword({ userId: 7, currentPassword: 'old-password', newPassword: 'new-password' })).resolves.toEqual({ success: true })
    expect(bcrypt.default.compare).toHaveBeenCalledWith('old-password', 'old-hash')
    expect(bcrypt.default.hash).toHaveBeenCalledWith('new-password', 12)
    expect(repository.changePassword).toHaveBeenCalledWith({ userId: 7, passwordHash: 'new-hash' })
  })

  it('rejects an incorrect current password without changing credentials', async () => {
    repository.findUserById.mockResolvedValue({ id: 7, isActive: true, passwordHash: 'old-hash' })
    bcrypt.default.compare.mockResolvedValue(false)
    await expect(changePassword({ userId: 7, currentPassword: 'wrong-password', newPassword: 'new-password' })).rejects.toThrow('Current password is incorrect.')
    expect(bcrypt.default.hash).not.toHaveBeenCalled()
    expect(repository.changePassword).not.toHaveBeenCalled()
  })

  it('invalidates all refresh sessions when changing password', async () => {
    repository.findUserById.mockResolvedValue({ id: 7, isActive: true, passwordHash: 'old-hash' })
    bcrypt.default.compare.mockResolvedValue(true)
    bcrypt.default.hash.mockResolvedValue('new-hash')
    repository.changePassword.mockResolvedValue({ id: 7, authVersion: 3 })
    await changePassword({ userId: 7, currentPassword: 'old-password', newPassword: 'new-password' })
    expect(repository.changePassword).toHaveBeenCalledWith({ userId: 7, passwordHash: 'new-hash' })
  })

  it('lists only the authenticated user sessions', async () => {
    repository.listActiveSessions.mockResolvedValue([{ id: 'session-1', createdAt: new Date(), expiresAt: new Date(Date.now() + 60000) }])
    await expect(getSessions({ userId: 7 })).resolves.toHaveLength(1)
    expect(repository.listActiveSessions).toHaveBeenCalledWith(7)
  })

  it('cannot revoke a session belonging to another user', async () => {
    repository.revokeSession.mockResolvedValue({ count: 0 })
    await expect(revokeSessionById({ userId: 7, sessionId: 'session-2' })).rejects.toThrow('Session not found or already revoked.')
    expect(repository.revokeSession).toHaveBeenCalledWith({ userId: 7, sessionId: 'session-2' })
  })

  it('revokes all sessions through authVersion invalidation', async () => {
    repository.bumpUserAuthVersion.mockResolvedValue({ id: 7, authVersion: 4 })
    await expect(revokeAllSessions({ userId: 7 })).resolves.toEqual({ success: true })
    expect(repository.bumpUserAuthVersion).toHaveBeenCalledWith(7)
  })
})

describe('architecture', () => {
  it('keeps auth repository persistence-only', async () => {
    const source = await readText(authRepositoryPath)
    expect(source).toContain("../../infrastructure/database/prisma.js")
    expect(source).not.toContain('../../infrastructure/maintenance/')
    expect(source).not.toContain("from 'node:crypto'")
    expect(source).not.toContain('.service.js')
    expect(source).not.toContain('throw new Error')
    expect(source).not.toContain('OAUTH_ACCOUNT_ALREADY_LINKED')
    expect(source).not.toContain('LAST_AUTH_METHOD')
  })

  it('keeps token hashing in the auth token boundary', async () => {
    const repositorySource = await readText(authRepositoryPath)
    const tokensSource = await readText(authTokensPath)
    expect(repositorySource).not.toContain('hashRefreshToken')
    expect(repositorySource).not.toContain('createHash(')
    expect(tokensSource).toContain('const hashToken')
    expect(tokensSource).toContain('createHash')
  })

  it('keeps refresh-token maintenance outside the auth feature repository', async () => {
    const repositorySource = await readText(authRepositoryPath)
    const maintenanceSource = await readText(authMaintenancePath)
    expect(repositorySource).not.toContain('deleteExpiredRefreshTokens')
    expect(maintenanceSource).toContain('deleteExpiredRefreshTokens')
  })

  it('prevents the Users feature from reaching into the Auth repository', async () => {
    const source = await readText(userServicePath)
    expect(source).not.toContain('../auth/auth.repository.js')
  })

  it('keeps OAuth policy in the OAuth service and persistence operations in the Auth repository', async () => {
    const repositorySource = await readText(authRepositoryPath)
    const serviceSource = await readText(oauthServicePath)
    expect(repositorySource).not.toContain('createOAuthUser')
    expect(repositorySource).not.toContain('linkOAuthAccount')
    expect(repositorySource).not.toContain('unlinkOAuthAccount')
    expect(repositorySource).toContain('createOAuthAccount')
    expect(repositorySource).toContain('deleteOAuthAccount')
    expect(serviceSource).toContain('findRoleByName')
    expect(serviceSource).toContain('countOAuthAccounts')
    expect(serviceSource).toContain('Cannot unlink the only authentication method')
  })
})
