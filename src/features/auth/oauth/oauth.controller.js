const { env } = require('../../../config')
const { UnauthorizedError } = require('../../../common/errors/appError')

const { authenticateWithOAuth } = require('./oauth.service')

const {
  OAUTH_STATE_COOKIE,
  createState,
  createAuthorizationUrl,
  setOAuthStateCookie,
  clearOAuthStateCookie,
  safeEqual,
} = require('./oauth.providers')

const setAuthCookies = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/v1/auth',
    maxAge: env.COOKIE_REFRESH_MAX_AGE_MS,
  })
}

const setCsrfCookie = (res) => {
  const crypto = require('crypto')
  const token = crypto.randomBytes(32).toString('hex')

  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: env.COOKIE_REFRESH_MAX_AGE_MS,
  })
}

const redirectFailure = (res, code) => {
  const url = new URL(env.OAUTH_FRONTEND_FAILURE_URL)
  url.searchParams.set('error', code)
  return res.redirect(url.toString())
}

const startOAuth = (provider) => (req, res) => {
  const state = createState()
  const authorizationUrl = createAuthorizationUrl(provider, state)

  setOAuthStateCookie(res, state)

  return res.redirect(authorizationUrl)
}

const handleOAuthCallback = (provider) => async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    clearOAuthStateCookie(res)
    return redirectFailure(res, 'oauth_denied')
  }

  const storedState = req.cookies?.[OAUTH_STATE_COOKIE]

  if (!code || !state || !safeEqual(storedState, state)) {
    clearOAuthStateCookie(res)
    return redirectFailure(res, 'invalid_oauth_state')
  }

  try {
    const result = await authenticateWithOAuth({
      provider,
      code,
    })

    setAuthCookies(res, result.refreshToken)
    setCsrfCookie(res)
    clearOAuthStateCookie(res)

    /*
     * Do not put the access token in the URL.
     *
     * The frontend receives the refresh cookie and
     * calls POST /api/v1/auth/refresh with the CSRF
     * token to obtain the access token as JSON.
     */
    return res.redirect(env.OAUTH_FRONTEND_SUCCESS_URL)
  } catch (error) {
    clearOAuthStateCookie(res)

    if (error instanceof UnauthorizedError) {
      return redirectFailure(res, 'oauth_unauthorized')
    }

    if (error.name === 'ConflictError') {
      return redirectFailure(res, 'account_exists')
    }

    return redirectFailure(res, 'oauth_failed')
  }
}

module.exports = {
  startOAuth,
  handleOAuthCallback,
}
