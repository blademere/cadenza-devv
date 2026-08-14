const { env } = require('../../../config')
const { UnauthorizedError, ConflictError } = require('../../../common/errors/appError')
const { setCsrfCookie } = require('../../../common/middleware/csrf')
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
  setOAuthStateCookie,
  clearOAuthStateCookie,
  OAUTH_LINK_STATE_COOKIE,
  createLinkState,
  verifyLinkState,
  setOAuthLinkStateCookie,
  clearOAuthLinkStateCookie,
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

const startOAuth = (provider) => (_req, res) => {
  const state = createState()
  const authorizationUrl = createAuthorizationUrl(provider, state)

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

  const linkState = req.cookies?.[OAUTH_LINK_STATE_COOKIE]

  if (linkState) {
    const linkPayload = verifyLinkState(linkState)

    if (!code || !state || !linkPayload || !safeEqual(state, linkState)) {
      clearOAuthLinkStateCookie(res)
      return redirectFailure(res, 'invalid_oauth_state')
    }

    try {
      const result = await linkOAuthAccountWithCode({
        userId: linkPayload.userId,
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

const startOAuthLink = (provider) => (req, res) => {
  if (!req.user?.id) {
    return redirectFailure(res, 'unauthorized')
  }

  const state = createLinkState(req.user.id)
  const authorizationUrl = createAuthorizationUrl(provider, state)

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
  startOAuth,
  handleOAuthCallback,
  startOAuthLink,
  listOAuthAccountsController,
  unlinkOAuthAccountController,
}
