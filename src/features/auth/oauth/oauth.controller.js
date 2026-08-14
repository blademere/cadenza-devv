const { env } = require('../../../config')
const {
  UnauthorizedError,
  ConflictError,
} = require('../../../common/errors/appError')
const { setCsrfCookie } = require('../../../common/middleware/csrf')
const asyncHandler = require('../../../common/middleware/asyncHandler')
const {
  authenticateWithOAuth,
  linkOAuthAccountWithCode,
  getLinkedOAuthAccounts,
  unlinkOAuthAccount,
} = require('./oauth.service')

const {
  OAUTH_STATE_COOKIE,
  createState,
  createAuthorizationUrl,
  storeOAuthState,
  consumeOAuthState,
  setOAuthStateCookie,
  clearOAuthStateCookie,
  OAUTH_LINK_STATE_COOKIE,
  setOAuthLinkStateCookie,
  clearOAuthLinkStateCookie,
  safeEqual,
  OAUTH_STATE_MAX_AGE_MS,
  OAUTH_LINK_STATE_MAX_AGE_MS,
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

const redirectFailure = (res, code) => {
  const url = new URL(env.OAUTH_FRONTEND_FAILURE_URL)
  url.searchParams.set('error', code)
  return res.redirect(url.toString())
}

const redirectSuccess = (res, params = {}) => {
  const url = new URL(env.OAUTH_FRONTEND_SUCCESS_URL)

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  return res.redirect(url.toString())
}

const startOAuth = (provider) => async (_req, res) => {
  clearOAuthLinkStateCookie(res)

  const state = createState()
  const authorizationUrl = createAuthorizationUrl(provider, state)

  await storeOAuthState(
    state,
    { flow: 'login', provider },
    OAUTH_STATE_MAX_AGE_MS
  )

  setOAuthStateCookie(res, state)

  return res.redirect(authorizationUrl)
}

const handleOAuthCallback = (provider) => async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    clearOAuthStateCookie(res)
    clearOAuthLinkStateCookie(res)
    return redirectFailure(res, 'oauth_denied')
  }

  if (!code || !state) {
    clearOAuthStateCookie(res)
    clearOAuthLinkStateCookie(res)
    return redirectFailure(res, 'invalid_oauth_state')
  }

  const loginState = req.cookies?.[OAUTH_STATE_COOKIE]
  const linkState = req.cookies?.[OAUTH_LINK_STATE_COOKIE]

  let cookieMatches = false

  if (loginState && safeEqual(loginState, state)) {
    cookieMatches = true
  }

  if (linkState && safeEqual(linkState, state)) {
    cookieMatches = true
  }

  if (!cookieMatches) {
    clearOAuthStateCookie(res)
    clearOAuthLinkStateCookie(res)
    return redirectFailure(res, 'invalid_oauth_state')
  }

  const stateData = await consumeOAuthState(state)

  if (!stateData || stateData.provider !== provider) {
    clearOAuthStateCookie(res)
    clearOAuthLinkStateCookie(res)
    return redirectFailure(res, 'invalid_oauth_state')
  }

  if (stateData.flow === 'link') {
    if (!stateData.userId || !Number.isInteger(Number(stateData.userId))) {
      clearOAuthLinkStateCookie(res)
      return redirectFailure(res, 'invalid_oauth_state')
    }

    try {
      const result = await linkOAuthAccountWithCode({
        userId: Number(stateData.userId),
        provider,
        code,
      })

      clearOAuthLinkStateCookie(res)

      return redirectSuccess(res, {
        action: 'oauth_linked',
        provider: result.provider,
      })
    } catch (error) {
      clearOAuthLinkStateCookie(res)

      if (error instanceof UnauthorizedError) {
        return redirectFailure(res, 'oauth_unauthorized')
      }

      if (error instanceof ConflictError) {
        return redirectFailure(res, 'oauth_link_conflict')
      }

      return redirectFailure(res, 'oauth_link_failed')
    }
  }

  if (stateData.flow !== 'login') {
    clearOAuthStateCookie(res)
    clearOAuthLinkStateCookie(res)
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

    return res.redirect(env.OAUTH_FRONTEND_SUCCESS_URL)
  } catch (error) {
    clearOAuthStateCookie(res)

    if (error instanceof UnauthorizedError) {
      return redirectFailure(res, 'oauth_unauthorized')
    }

    if (error instanceof ConflictError) {
      return redirectFailure(res, 'account_exists')
    }

    return redirectFailure(res, 'oauth_failed')
  }
}

const startOAuthLink = (provider) => async (req, res) => {
  if (!req.user?.id) {
    return redirectFailure(res, 'unauthorized')
  }

  clearOAuthStateCookie(res)

  const state = createState()
  const authorizationUrl = createAuthorizationUrl(provider, state)

  await storeOAuthState(
    state,
    { flow: 'link', provider, userId: Number(req.user.id) },
    OAUTH_LINK_STATE_MAX_AGE_MS
  )

  setOAuthLinkStateCookie(res, state)

  return res.redirect(authorizationUrl)
}

const listOAuthAccountsController = async (req, res) => {
  const accounts = await getLinkedOAuthAccounts(req.user.id)

  return res.status(200).json({
    success: true,
    data: accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      createdAt: account.createdAt,
    })),
  })
}

const unlinkOAuthAccountController = async (req, res) => {
  const result = await unlinkOAuthAccount({
    userId: req.user.id,
    provider: req.params.provider,
  })

  return res.status(200).json({
    success: true,
    message: `${result.provider} OAuth account unlinked successfully.`,
  })
}

module.exports = {
  startOAuth: (provider) => asyncHandler(startOAuth(provider)),
  handleOAuthCallback,
  startOAuthLink: (provider) => asyncHandler(startOAuthLink(provider)),
  listOAuthAccountsController,
  unlinkOAuthAccountController,
}
