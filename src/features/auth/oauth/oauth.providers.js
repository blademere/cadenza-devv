const crypto = require('crypto')

const { env } = require('../../../config')
const { connectRedis } = require('../../../infrastructure/cache/redis')

const OAUTH_STATE_COOKIE = 'oauthState'
const OAUTH_LINK_STATE_COOKIE = 'oauthLinkState'
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000
const OAUTH_LINK_STATE_MAX_AGE_MS = 10 * 60 * 1000
const OAUTH_STATE_KEY_PREFIX = 'oauth:state:'

const providerConfig = {
  google: {
    clientId: env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET,
    callbackUrl: env.OAUTH_GOOGLE_CALLBACK_URL,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: ['openid', 'email', 'profile'],
  },
  github: {
    clientId: env.OAUTH_GITHUB_CLIENT_ID,
    clientSecret: env.OAUTH_GITHUB_CLIENT_SECRET,
    callbackUrl: env.OAUTH_GITHUB_CALLBACK_URL,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: ['read:user', 'user:email'],
  },
}

const getProviderConfig = (provider) => {
  const config = providerConfig[provider]

  if (!config?.clientId || !config.clientSecret || !config.callbackUrl) {
    throw new Error(`${provider} OAuth is not configured.`)
  }

  return config
}

// OAuth providers should only receive an opaque, high-entropy value.
// All application state (flow, provider, userId) is kept server-side in Redis.
const createState = () => crypto.randomBytes(32).toString('base64url')

const createAuthorizationUrl = (provider, state) => {
  const config = getProviderConfig(provider)
  const url = new URL(config.authorizationUrl)

  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.callbackUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', config.scope.join(' '))

  if (provider === 'google') {
    url.searchParams.set('access_type', 'online')
    url.searchParams.set('include_granted_scopes', 'true')
    url.searchParams.set('prompt', 'select_account')
  }

  if (provider === 'github') {
    url.searchParams.set('allow_signup', 'true')
  }

  return url.toString()
}

const getStateKey = (state) => {
  return `${OAUTH_STATE_KEY_PREFIX}${crypto.createHash('sha256').update(state).digest('hex')}`
}

const storeOAuthState = async (state, metadata, maxAgeMs) => {
  if (typeof state !== 'string' || state.length < 32) {
    throw new Error('OAuth state must be a high-entropy string.')
  }

  if (!metadata || typeof metadata !== 'object') {
    throw new Error('OAuth state metadata is required.')
  }

  const { flow, provider, userId } = metadata

  if (!['login', 'link'].includes(flow)) {
    throw new Error('Invalid OAuth state flow.')
  }

  if (!providerConfig[provider]) {
    throw new Error('Invalid OAuth state provider.')
  }

  if (flow === 'link' && (!Number.isInteger(Number(userId)) || Number(userId) <= 0)) {
    throw new Error('A valid userId is required for OAuth linking.')
  }

  const value = JSON.stringify({
    flow,
    provider,
    ...(flow === 'link' ? { userId: Number(userId) } : {}),
  })

  const client = await connectRedis()
  const ttlSeconds = Math.ceil(maxAgeMs / 1000)
  const key = getStateKey(state)

  const stored = await client.set(key, value, {
    NX: true,
    EX: ttlSeconds,
  })

  if (stored !== 'OK') {
    throw new Error('OAuth state collision detected.')
  }
}

const consumeOAuthState = async (state, expectedFlow, expectedProvider) => {
  if (typeof state !== 'string' || state.length < 32) return null

  const client = await connectRedis()
  const value = await client.getDel(getStateKey(state))

  if (!value) return null

  try {
    const metadata = JSON.parse(value)

    if (
      metadata.flow !== expectedFlow ||
      metadata.provider !== expectedProvider
    ) {
      return null
    }

    if (
      expectedFlow === 'link' &&
      (!Number.isInteger(metadata.userId) || metadata.userId <= 0)
    ) {
      return null
    }

    return metadata
  } catch {
    return null
  }
}

const setOAuthStateCookie = (res, state) => {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/v1/auth/oauth',
    maxAge: OAUTH_STATE_MAX_AGE_MS,
  })
}

const clearOAuthStateCookie = (res) => {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/v1/auth/oauth',
  })
}

const setOAuthLinkStateCookie = (res, state) => {
  res.cookie(OAUTH_LINK_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/v1/auth/oauth',
    maxAge: OAUTH_LINK_STATE_MAX_AGE_MS,
  })
}

const clearOAuthLinkStateCookie = (res) => {
  res.clearCookie(OAUTH_LINK_STATE_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/v1/auth/oauth',
  })
}

const safeEqual = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false

  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')

  if (leftBuffer.length !== rightBuffer.length) return false

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

module.exports = {
  OAUTH_STATE_COOKIE,
  OAUTH_LINK_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_MS,
  OAUTH_LINK_STATE_MAX_AGE_MS,
  getProviderConfig,
  createState,
  createAuthorizationUrl,
  storeOAuthState,
  consumeOAuthState,
  setOAuthStateCookie,
  clearOAuthStateCookie,
  setOAuthLinkStateCookie,
  clearOAuthLinkStateCookie,
  safeEqual,
}
