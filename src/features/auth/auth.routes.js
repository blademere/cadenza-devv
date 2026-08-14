const express = require('express')

const {
  loginController,
  refreshAccessTokenController,
  logoutController,
} = require('./auth.controller')

const { loginValidator } = require('./auth.validation')

const {
  asyncHandler,
  authenticate,
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
} = require('../../common/middleware')

const validate = require('../../common/middleware/validate')
const { csrfProtection } = require('../../common/middleware/csrf')

const {
  startOAuth,
  handleOAuthCallback,
  startOAuthLink,
  listOAuthAccountsController,
  unlinkOAuthAccountController,
} = require('./oauth/oauth.controller')

const authRouter = express.Router()

authRouter.post(
  '/login',
  loginRateLimiter,
  validate(loginValidator),
  asyncHandler(loginController),
)

/* OAuth authentication. */
authRouter.get('/oauth/google', oauthRateLimiter, startOAuth('google'))
authRouter.get('/oauth/google/callback', oauthRateLimiter, asyncHandler(handleOAuthCallback('google')))
authRouter.get('/oauth/github', oauthRateLimiter, startOAuth('github'))
authRouter.get('/oauth/github/callback', oauthRateLimiter, asyncHandler(handleOAuthCallback('github')))

/*
 * OAuth account management.
 *
 * Linking requires an existing application session.
 * The authenticated user ID is cryptographically bound
 * into the short-lived OAuth link state.
 */
authRouter.get(
  '/oauth/accounts',
  authenticate,
  asyncHandler(listOAuthAccountsController),
)

authRouter.get(
  '/oauth/link/google',
  oauthRateLimiter,
  authenticate,
  startOAuthLink('google'),
)

authRouter.get(
  '/oauth/link/github',
  oauthRateLimiter,
  authenticate,
  startOAuthLink('github'),
)

authRouter.delete(
  '/oauth/link/:provider',
  authenticate,
  asyncHandler(unlinkOAuthAccountController),
)

/*
 * Refresh.
 *
 * The refresh token is supplied through the
 * HttpOnly cookie, so CSRF protection remains
 * required.
 */
authRouter.post(
  '/refresh',
  refreshRateLimiter,
  csrfProtection,
  asyncHandler(refreshAccessTokenController),
)

authRouter.post(
  '/logout',
  logoutRateLimiter,
  csrfProtection,
  asyncHandler(logoutController),
)

module.exports = authRouter
