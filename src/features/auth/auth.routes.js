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

const authRouter = express.Router()

/*
 * Login
 *
 * The login limiter counts failed requests only.
 * Successful logins are removed from the rate-limit
 * count after the response completes.
 */
authRouter.post(
  '/login',
  loginRateLimiter,
  validate(loginValidator),
  asyncHandler(loginController)
)

/*
 * Refresh
 *
 * The refresh token is supplied through the
 * HttpOnly cookie, so CSRF protection remains
 * required. The dedicated limiter prevents an
 * attacker from abusing the refresh endpoint
 * independently of the global API limiter.
 */
authRouter.post(
  '/refresh',
  refreshRateLimiter,
  csrfProtection,
  asyncHandler(refreshAccessTokenController)
)

/*
 * Logout
 *
 * Keep logout protected by CSRF and give it a
 * separate, more permissive authentication limit.
 */
authRouter.post(
  '/logout',
  logoutRateLimiter,
  csrfProtection,
  asyncHandler(logoutController)
)

module.exports = authRouter
