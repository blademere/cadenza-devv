const express = require('express')
const { csrfTokenController, loginController, currentUserController, refreshAccessTokenController, logoutController } = require('./auth.controller')
const { loginValidator } = require('./auth.validation')
const authenticate = require('./authenticate.secure')
const { asyncHandler, loginRateLimiter, refreshRateLimiter, logoutRateLimiter, oauthRateLimiter, idempotency } = require('../../common/middleware')
const validate = require('../../common/middleware/validate')
const { csrfProtection } = require('../../common/middleware/csrf')
const { startOAuth, handleOAuthCallback, startOAuthLink, listOAuthAccountsController, unlinkOAuthAccountController } = require('./oauth/oauth.controller')

const authRouter = express.Router()
const requireAuthIdempotency = idempotency({ scope: 'auth', required: true })

// CSRF token bootstrap is safe to call before authentication and is required by browser clients for state-changing auth requests.
authRouter.get('/csrf', asyncHandler(csrfTokenController))
// Login intentionally does not use idempotency: it creates a new authentication session.
authRouter.post('/login', loginRateLimiter, validate(loginValidator), asyncHandler(loginController))
authRouter.get('/me', authenticate, asyncHandler(currentUserController))
authRouter.get('/oauth/google', oauthRateLimiter, asyncHandler(startOAuth('google')))
authRouter.get('/oauth/google/callback', oauthRateLimiter, asyncHandler(handleOAuthCallback('google')))
authRouter.get('/oauth/facebook', oauthRateLimiter, asyncHandler(startOAuth('facebook')))
authRouter.get('/oauth/facebook/callback', oauthRateLimiter, asyncHandler(handleOAuthCallback('facebook')))
authRouter.get('/oauth/accounts', authenticate, asyncHandler(listOAuthAccountsController))
authRouter.get('/oauth/link/google', oauthRateLimiter, authenticate, asyncHandler(startOAuthLink('google')))
authRouter.get('/oauth/link/facebook', oauthRateLimiter, authenticate, asyncHandler(startOAuthLink('facebook')))
authRouter.delete('/oauth/link/:provider', authenticate, requireAuthIdempotency, asyncHandler(unlinkOAuthAccountController))
authRouter.post('/refresh', refreshRateLimiter, csrfProtection, requireAuthIdempotency, asyncHandler(refreshAccessTokenController))
authRouter.post('/logout', logoutRateLimiter, csrfProtection, requireAuthIdempotency, asyncHandler(logoutController))

module.exports = authRouter
