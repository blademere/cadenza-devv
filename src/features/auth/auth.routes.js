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
  asyncHandler(loginController)
)

authRouter.get(
  '/oauth/google',
  oauthRateLimiter,
  asyncHandler(startOAuth('google'))
)
authRouter.get(
  '/oauth/google/callback',
  oauthRateLimiter,
  asyncHandler(handleOAuthCallback('google'))
)
authRouter.get(
  '/oauth/github',
  oauthRateLimiter,
  asyncHandler(startOAuth('github'))
)
authRouter.get(
  '/oauth/github/callback',
  oauthRateLimiter,
  asyncHandler(handleOAuthCallback('github'))
)

authRouter.get(
  '/oauth/accounts',
  authenticate,
  asyncHandler(listOAuthAccountsController)
)

authRouter.get(
  '/oauth/link/google',
  oauthRateLimiter,
  authenticate,
  asyncHandler(startOAuthLink('google'))
)

authRouter.get(
  '/oauth/link/github',
  oauthRateLimiter,
  authenticate,
  asyncHandler(startOAuthLink('github'))
)

authRouter.delete(
  '/oauth/link/:provider',
  authenticate,
  asyncHandler(unlinkOAuthAccountController)
)

authRouter.post(
  '/refresh',
  refreshRateLimiter,
  csrfProtection,
  asyncHandler(refreshAccessTokenController)
)

authRouter.post(
  '/logout',
  logoutRateLimiter,
  csrfProtection,
  asyncHandler(logoutController)
)

module.exports = authRouter
