import { env, logger } from '../../../config'
import {
  UnauthorizedError,
  ConflictError,
} from '../../../common/errors/appError.js'
import { setCsrfCookie } from '../../../common/middleware/csrf.js'
import asyncHandler from '../../../common/middleware/asyncHandler.js'
import {
  authenticateWithOAuth,
  linkOAuthAccountWithCode,
  getLinkedOAuthAccounts,
  unlinkOAuthAccount,
} from './oauth.service.js'

import {
  OAUTH_STATE_COOKIE,
  createState,
  createPkceVerifier,
  createPkceChallenge,
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
} from './oauth.providers.js'

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
  return res.redirect(303, url.toString())
}

const redirectSuccess = (res, params = {}) => {
  const url = new URL(env.OAUTH_FRONTEND_SUCCESS_URL)

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  return res.redirect(303, url.toString())
}

const startOAuth = (provider) =>
  asyncHandler(async (_req, res) => {
    clearOAuthLinkStateCookie(res)

    const state = createState()
    const codeVerifier = createPkceVerifier()
    const codeChallenge = createPkceChallenge(codeVerifier)
    const authorizationUrl = createAuthorizationUrl(
      provider,
      state,
      codeChallenge
    )

    await storeOAuthState(
      state,
      { flow: 'login', provider, codeVerifier },
      OAUTH_STATE_MAX_AGE_MS
    )

    setOAuthStateCookie(res, state)

    return res.redirect(302, authorizationUrl)
  })

const handleOAuthCallback = (provider) =>
  asyncHandler(async (req, res) => {
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

    const cookieMatchesLogin = loginState && safeEqual(loginState, state)
    const cookieMatchesLink = linkState && safeEqual(linkState, state)

    if (!cookieMatchesLogin && !cookieMatchesLink) {
      clearOAuthStateCookie(res)
      clearOAuthLinkStateCookie(res)
      return redirectFailure(res, 'invalid_oauth_state')
    }

    let stateData
    try {
      stateData = await consumeOAuthState(state, undefined, provider)
    } catch (error) {
      logger.error({ err: error, provider }, 'OAuth state consumption failed')
      clearOAuthStateCookie(res)
      clearOAuthLinkStateCookie(res)
      return redirectFailure(res, 'oauth_state_failed')
    }

    if (!stateData) {
      clearOAuthStateCookie(res)
      clearOAuthLinkStateCookie(res)
      return redirectFailure(res, 'invalid_oauth_state')
    }

    if (stateData.flow === 'login' && !cookieMatchesLogin) {
      clearOAuthStateCookie(res)
      clearOAuthLinkStateCookie(res)
      return redirectFailure(res, 'invalid_oauth_state')
    }

    if (stateData.flow === 'link' && !cookieMatchesLink) {
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
          codeVerifier: stateData.codeVerifier,
        })

        clearOAuthLinkStateCookie(res)

        return redirectSuccess(res, {
          action: 'oauth_linked',
          provider: result.provider,
        })
      } catch (error) {
        logger.error(
          { err: error, provider, flow: 'link' },
          'OAuth account linking failed'
        )
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
        codeVerifier: stateData.codeVerifier,
      })

      setAuthCookies(res, result.refreshToken)
      setCsrfCookie(res)
      clearOAuthStateCookie(res)

      return redirectSuccess(res)
    } catch (error) {
      logger.error(
        { err: error, provider, flow: 'login' },
        'OAuth authentication failed'
      )
      clearOAuthStateCookie(res)

      if (error instanceof UnauthorizedError) {
        return redirectFailure(res, 'oauth_unauthorized')
      }

      if (error instanceof ConflictError) {
        return redirectFailure(res, 'account_exists')
      }

      return redirectFailure(res, 'oauth_failed')
    }
  })

const startOAuthLink = (provider) =>
  asyncHandler(async (req, res) => {
    if (!req.user?.id) {
      return redirectFailure(res, 'unauthorized')
    }

    clearOAuthStateCookie(res)

    const state = createState()
    const codeVerifier = createPkceVerifier()
    const codeChallenge = createPkceChallenge(codeVerifier)
    const authorizationUrl = createAuthorizationUrl(
      provider,
      state,
      codeChallenge
    )

    await storeOAuthState(
      state,
      { flow: 'link', provider, userId: Number(req.user.id), codeVerifier },
      OAUTH_LINK_STATE_MAX_AGE_MS
    )

    setOAuthLinkStateCookie(res, state)

    return res.redirect(302, authorizationUrl)
  })

const listOAuthAccountsController = asyncHandler(async (req, res) => {
  const accounts = await getLinkedOAuthAccounts(req.user.id)

  return res.status(200).json({
    success: true,
    data: accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      createdAt: account.createdAt,
    })),
  })
})

const unlinkOAuthAccountController = asyncHandler(async (req, res) => {
  const result = await unlinkOAuthAccount({
    userId: req.user.id,
    provider: req.params.provider,
  })

  return res.status(200).json({
    success: true,
    message: `${result.provider} OAuth account unlinked successfully.`,
  })
})

export {
  startOAuth,
  handleOAuthCallback,
  startOAuthLink,
  listOAuthAccountsController,
  unlinkOAuthAccountController,
}
