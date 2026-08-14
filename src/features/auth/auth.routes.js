const express = require('express')

const {
  loginController,
  refreshAccessTokenController,
  logoutController,
} = require('./auth.controller')

const { loginValidator } = require('./auth.validation')

const { asyncHandler } = require('../../common/middleware')

const validate = require('../../common/middleware/validate')

const { csrfProtection } = require('../../common/middleware/csrf')

const authRouter = express.Router()

/*
 * Login
 *
 * Sets:
 *
 * - refreshToken HttpOnly cookie
 * - csrfToken cookie
 *
 * Returns:
 *
 * - accessToken
 * - csrfToken
 * - user
 */
authRouter.post(
  '/login',

  validate(loginValidator),

  asyncHandler(loginController)
)

/*
 * Refresh
 *
 * Refresh token comes from:
 *
 * HttpOnly cookie
 *
 * CSRF protection is required because
 * cookies are automatically attached by
 * the browser.
 */
authRouter.post(
  '/refresh',

  csrfProtection,

  asyncHandler(refreshAccessTokenController)
)

/*
 * Logout
 *
 * Refresh token is read from the
 * HttpOnly cookie.
 */
authRouter.post(
  '/logout',

  csrfProtection,

  asyncHandler(logoutController)
)

module.exports = authRouter
