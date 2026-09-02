import { beforeEach, describe, expect, it, vi } from 'vitest'

const redis = { set: vi.fn(), getDel: vi.fn() }
const connectRedis = vi.fn(async () => redis)

vi.mock('../../../../src/infrastructure/cache/redis.js', () => ({
  connectRedis,
}))

vi.mock('../../../../src/config/index.js', () => ({
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

const { consumeOAuthState, storeOAuthState } = await import('../../../../src/features/auth/oauth/oauth.providers.js')
const validState = 'a'.repeat(43)
const validVerifier = 'b'.repeat(43)

beforeEach(() => vi.clearAllMocks())

describe('OAuth state storage', () => {
  it('stores login state atomically with NX and EX, including the PKCE verifier', async () => {
    redis.set.mockResolvedValue('OK')
    await storeOAuthState(validState, { flow: 'login', provider: 'google', codeVerifier: validVerifier }, 600000)
    expect(redis.set).toHaveBeenCalledTimes(1)
    expect(redis.set).toHaveBeenCalledWith(expect.stringMatching(/^oauth:state:[a-f0-9]{64}$/), JSON.stringify({ flow: 'login', provider: 'google', codeVerifier: validVerifier }), { NX: true, EX: 600 })
  })
  it('stores link state with a normalized numeric user id and PKCE verifier', async () => {
    redis.set.mockResolvedValue('OK')
    await storeOAuthState(validState, { flow: 'link', provider: 'facebook', userId: '42', codeVerifier: validVerifier }, 30000)
    expect(redis.set).toHaveBeenCalledWith(expect.any(String), JSON.stringify({ flow: 'link', provider: 'facebook', codeVerifier: validVerifier, userId: 42 }), { NX: true, EX: 30 })
  })
  it('rejects invalid state input', async () => {
    await expect(storeOAuthState('short', { flow: 'login', provider: 'google', codeVerifier: validVerifier }, 600000)).rejects.toThrow('OAuth state must be a high-entropy string.')
    expect(redis.set).not.toHaveBeenCalled()
  })
  it('rejects invalid flow and provider metadata', async () => {
    await expect(storeOAuthState(validState, { flow: 'unknown', provider: 'google', codeVerifier: validVerifier }, 600000)).rejects.toThrow('Invalid OAuth state flow.')
    await expect(storeOAuthState(validState, { flow: 'login', provider: 'github', codeVerifier: validVerifier }, 600000)).rejects.toThrow('Invalid OAuth state provider.')
  })
  it('requires a valid PKCE verifier', async () => {
    await expect(storeOAuthState(validState, { flow: 'login', provider: 'google' }, 600000)).rejects.toThrow('A valid PKCE code verifier is required.')
  })
  it('requires a valid user id for link state', async () => {
    await expect(storeOAuthState(validState, { flow: 'link', provider: 'google', codeVerifier: validVerifier }, 600000)).rejects.toThrow('A valid userId is required for OAuth linking.')
  })
  it('rejects state collisions', async () => {
    redis.set.mockResolvedValue(null)
    await expect(storeOAuthState(validState, { flow: 'login', provider: 'google', codeVerifier: validVerifier }, 600000)).rejects.toThrow('OAuth state collision detected.')
  })
})

describe('OAuth state consumption', () => {
  it('atomically consumes a valid login state', async () => {
    redis.getDel.mockResolvedValue(JSON.stringify({ flow: 'login', provider: 'google', codeVerifier: validVerifier }))
    await expect(consumeOAuthState(validState, 'login', 'google')).resolves.toEqual({ flow: 'login', provider: 'google', codeVerifier: validVerifier })
    expect(redis.getDel).toHaveBeenCalledWith(expect.stringMatching(/^oauth:state:[a-f0-9]{64}$/))
  })
  it('atomically consumes a valid link state', async () => {
    redis.getDel.mockResolvedValue(JSON.stringify({ flow: 'link', provider: 'facebook', userId: 42, codeVerifier: validVerifier }))
    await expect(consumeOAuthState(validState, 'link', 'facebook')).resolves.toEqual({ flow: 'link', provider: 'facebook', userId: 42, codeVerifier: validVerifier })
  })
  it('rejects a missing or expired state', async () => {
    redis.getDel.mockResolvedValue(null)
    await expect(consumeOAuthState(validState, 'login', 'google')).resolves.toBeNull()
  })
  it('rejects a state used for the wrong flow', async () => {
    redis.getDel.mockResolvedValue(JSON.stringify({ flow: 'login', provider: 'google', codeVerifier: validVerifier }))
    await expect(consumeOAuthState(validState, 'link', 'google')).resolves.toBeNull()
  })
  it('rejects a state used for the wrong provider', async () => {
    redis.getDel.mockResolvedValue(JSON.stringify({ flow: 'login', provider: 'google', codeVerifier: validVerifier }))
    await expect(consumeOAuthState(validState, 'login', 'facebook')).resolves.toBeNull()
  })
  it('rejects malformed stored metadata', async () => {
    redis.getDel.mockResolvedValue('{not-json')
    await expect(consumeOAuthState(validState, 'login', 'google')).resolves.toBeNull()
  })
  it('rejects stored metadata without a PKCE verifier', async () => {
    redis.getDel.mockResolvedValue(JSON.stringify({ flow: 'login', provider: 'google' }))
    await expect(consumeOAuthState(validState, 'login', 'google')).resolves.toBeNull()
  })
  it('rejects invalid stored link user ids', async () => {
    redis.getDel.mockResolvedValue(JSON.stringify({ flow: 'link', provider: 'facebook', userId: 0, codeVerifier: validVerifier }))
    await expect(consumeOAuthState(validState, 'link', 'facebook')).resolves.toBeNull()
  })
  it('rejects invalid expected flow and provider before Redis access', async () => {
    await expect(consumeOAuthState(validState, 'invalid', 'google')).rejects.toThrow('Invalid expected OAuth state flow.')
    await expect(consumeOAuthState(validState, 'login', 'github')).rejects.toThrow('Invalid expected OAuth state provider.')
    expect(redis.getDel).not.toHaveBeenCalled()
  })
  it('does not consume short or invalid states', async () => {
    await expect(consumeOAuthState('short', 'login', 'google')).resolves.toBeNull()
    expect(redis.getDel).not.toHaveBeenCalled()
  })
})
