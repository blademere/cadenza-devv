const express = require('express')

const {
  loginController,
  refreshAccessTokenController,
  logoutController,
} = require('./auth.controller')

const { loginValidator } = require('./auth.validation')

const {
  asyncHandler,
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
} = require('../../common/middleware')

const validate = require('../../common/middleware/validate')

const { csrfProtection } = require('../../common/middleware/csrf')

const {
  startOAuth,
  handleOAuthCallback,
} = require('./oauth/oauth.controller')

const authRouter = express.Router()

/*
 * Password authentication.
 */
authRouter.post(
  '/login',
  loginRateLimiter,
  validate(loginValidator),
  asyncHandler(loginController),
)

/*
 * OAuth authorization endpoints.
 *
 * GET /api/v1/auth/oauth/google
 * GET /api/v1/auth/oauth/google/callback
 * GET /api/v1/auth/oauth/github
 * GET /api/v1/auth/oauth/github/callback
 */
authRouter.get(
  '/oauth/google',
  startOAuth('google'),
)

authRouter.get(
  '/oauth/google/callback',
  asyncHandler(handleOAuthCallback('google')),
)

authRouter.get(
  '/oauth/github',
  startOAuth('github'),
)

authRouter.get(
  '/oauth/github/callback',
  asyncHandler(handleOAuthCallback('github')),
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

/*
 * Logout.
 */
authRouter.post(
  '/logout',
  logoutRateLimiter,
  csrfProtection,
  asyncHandler(logoutController),
)

module.exports = authRouter
