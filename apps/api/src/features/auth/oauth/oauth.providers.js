import { crypto } from 'node:crypto'
import { env } from '../../../config.js'
import { connectRedis } from '../../../infrastructure/cache/redis.js'
import { getGoogleAuthUrl } from '../../../infrastructure/oauth/google.js'
import {
  getFacebookAuthUrl,
  getFacebookTokenUrl,
  getFacebookUserInfoUrl,
} from '../../../infrastructure/oauth/facebook.js'

const OAUTH_STATE_COOKIE = 'oauthState'
const OAUTH_LINK_STATE_COOKIE = 'oauthLinkState'
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000
const OAUTH_LINK_STATE_MAX_AGE_MS = 10 * 60 * 1000
const OAUTH_STATE_KEY_PREFIX = 'oauth:state:'
const PKCE_VERIFIER_BYTES = 32

const providerConfig = {
  google: {
    clientId: env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET,
    callbackUrl: env.OAUTH_GOOGLE_CALLBACK_URL,
    authorizationUrl: getGoogleAuthUrl(),
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: ['openid', 'email', 'profile'],
  },
  facebook: {
    clientId: env.OAUTH_FACEBOOK_CLIENT_ID,
    clientSecret: env.OAUTH_FACEBOOK_CLIENT_SECRET,
    callbackUrl: env.OAUTH_FACEBOOK_CALLBACK_URL,
    authorizationUrl: getFacebookAuthUrl(env.OAUTH_FACEBOOK_API_VERSION),
    tokenUrl: getFacebookTokenUrl(env.OAUTH_FACEBOOK_API_VERSION),
    userInfoUrl: getFacebookUserInfoUrl(env.OAUTH_FACEBOOK_API_VERSION),
    scope: ['email'],
  },
}

const getProviderConfig = (provider) => {
  const config = providerConfig[provider]

  if (!config?.clientId || !config.clientSecret || !config.callbackUrl) {
    throw new Error(`${provider} OAuth is not configured.`)
  }

  return config
}

const createState = () => crypto.randomBytes(32).toString('base64url')

const createPkceVerifier = () =>
  crypto.randomBytes(PKCE_VERIFIER_BYTES).toString('base64url')

const createPkceChallenge = (verifier) =>
  crypto.createHash('sha256').update(verifier).digest('base64url')

const createAuthorizationUrl = (provider, state, codeChallenge) => {
  const config = getProviderConfig(provider)
  const url = new URL(config.authorizationUrl)

  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.callbackUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', config.scope.join(' '))
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')

  if (provider === 'google') {
    url.searchParams.set('access_type', 'online')
    url.searchParams.set('include_granted_scopes', 'true')
    url.searchParams.set('prompt', 'select_account')
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

  const { flow, provider, userId, codeVerifier } = metadata

  if (!['login', 'link'].includes(flow)) {
    throw new Error('Invalid OAuth state flow.')
  }

  if (!providerConfig[provider]) {
    throw new Error('Invalid OAuth state provider.')
  }

  if (typeof codeVerifier !== 'string' || codeVerifier.length < 43) {
    throw new Error('A valid PKCE code verifier is required.')
  }

  if (
    flow === 'link' &&
    (!Number.isInteger(Number(userId)) || Number(userId) <= 0)
  ) {
    throw new Error('A valid userId is required for OAuth linking.')
  }

  const value = JSON.stringify({
    flow,
    provider,
    codeVerifier,
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

  if (expectedFlow !== undefined && !['login', 'link'].includes(expectedFlow)) {
    throw new Error('Invalid expected OAuth state flow.')
  }

  if (
    expectedProvider !== undefined &&
    !Object.prototype.hasOwnProperty.call(providerConfig, expectedProvider)
  ) {
    throw new Error('Invalid expected OAuth state provider.')
  }

  const client = await connectRedis()
  const value = await client.getDel(getStateKey(state))

  if (!value) return null

  try {
    const metadata = JSON.parse(value)

    if (expectedFlow !== undefined && metadata.flow !== expectedFlow) {
      return null
    }

    if (
      expectedProvider !== undefined &&
      metadata.provider !== expectedProvider
    ) {
      return null
    }

    if (!['login', 'link'].includes(metadata.flow)) {
      return null
    }

    if (
      !Object.prototype.hasOwnProperty.call(providerConfig, metadata.provider)
    ) {
      return null
    }

    if (
      typeof metadata.codeVerifier !== 'string' ||
      metadata.codeVerifier.length < 43
    ) {
      return null
    }

    if (
      metadata.flow === 'link' &&
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

export {
  OAUTH_STATE_COOKIE,
  OAUTH_LINK_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_MS,
  OAUTH_LINK_STATE_MAX_AGE_MS,
  getProviderConfig,
  createState,
  createPkceVerifier,
  createPkceChallenge,
  createAuthorizationUrl,
  storeOAuthState,
  consumeOAuthState,
  setOAuthStateCookie,
  clearOAuthStateCookie,
  setOAuthLinkStateCookie,
  clearOAuthLinkStateCookie,
  safeEqual,
}
