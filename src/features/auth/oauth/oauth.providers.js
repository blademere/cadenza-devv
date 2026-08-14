const crypto = require('crypto')

const { env } = require('../../../config')

const OAUTH_STATE_COOKIE = 'oauthState'
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000

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

const safeEqual = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false

  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')

  if (leftBuffer.length !== rightBuffer.length) return false

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

module.exports = {
  OAUTH_STATE_COOKIE,
  getProviderConfig,
  createState,
  createAuthorizationUrl,
  setOAuthStateCookie,
  clearOAuthStateCookie,
  safeEqual,
}
