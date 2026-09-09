import express from 'express'
import {
  csrfTokenController,
  registerUserController,
  loginController,
  requestPasswordResetController,
  resetPasswordController,
  currentUserController,
  selfProfileController,
  updateSelfProfileController,
  changePasswordController,
  listSessionsController,
  revokeSessionController,
  revokeAllSessionsController,
  refreshAccessTokenController,
  logoutController,
  verifyEmailController,
  requestEmailVerificationController,
} from './auth.controller.js'
import {
  loginValidator,
  registrationValidator,
  passwordChangeValidator,
  passwordResetRequestValidator,
  passwordResetValidator,
  emailVerificationValidator,
  sessionIdValidator,
  selfProfileValidator,
} from './auth.validation.js'
import authenticate from './authenticate.secure.js'
import {
  asyncHandler,
  loginRateLimiter,
  loginAccountRateLimiter,
  registerRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
  idempotency,
} from '../../common/middleware/index.js'
import validate from '../../common/middleware/validate.js'
import { csrfProtection } from '../../common/middleware/csrf.js'
import {
  startOAuth,
  handleOAuthCallback,
  startOAuthLink,
  listOAuthAccountsController,
  unlinkOAuthAccountController,
} from './oauth/oauth.controller.js'

const authRouter = express.Router()
const requireAuthIdempotency = idempotency({ scope: 'auth', required: true })
const requireRegistrationIdempotency = idempotency({ scope: 'auth-registration', required: true })
const requirePasswordResetIdempotency = idempotency({ scope: 'auth-password-reset', required: true })
const requireEmailVerificationIdempotency = idempotency({ scope: 'auth-email-verification', required: true })
authRouter.get('/csrf', asyncHandler(csrfTokenController))
authRouter.post('/register', registerRateLimiter, validate(registrationValidator), requireRegistrationIdempotency, asyncHandler(registerUserController))
authRouter.post('/login', loginRateLimiter, loginAccountRateLimiter, validate(loginValidator), asyncHandler(loginController))
authRouter.post('/password/reset/request', loginRateLimiter, validate(passwordResetRequestValidator), requirePasswordResetIdempotency, asyncHandler(requestPasswordResetController))
authRouter.post('/password/reset', loginRateLimiter, validate(passwordResetValidator), requirePasswordResetIdempotency, asyncHandler(resetPasswordController))
authRouter.post('/email/verify', loginRateLimiter, validate(emailVerificationValidator), requireEmailVerificationIdempotency, asyncHandler(verifyEmailController))
authRouter.get('/me', authenticate, asyncHandler(currentUserController))
authRouter.get('/me/profile', authenticate, asyncHandler(selfProfileController))
authRouter.patch('/me/profile', authenticate, csrfProtection, validate(selfProfileValidator), requireAuthIdempotency, asyncHandler(updateSelfProfileController))
authRouter.post('/email/verification/request', authenticate, csrfProtection, requireEmailVerificationIdempotency, asyncHandler(requestEmailVerificationController))
authRouter.post('/password/change', authenticate, csrfProtection, validate(passwordChangeValidator), requireAuthIdempotency, asyncHandler(changePasswordController))
authRouter.get('/sessions', authenticate, asyncHandler(listSessionsController))
authRouter.delete('/sessions/:id', authenticate, csrfProtection, validate(sessionIdValidator), requireAuthIdempotency, asyncHandler(revokeSessionController))
authRouter.post('/sessions/revoke-all', authenticate, csrfProtection, requireAuthIdempotency, asyncHandler(revokeAllSessionsController))
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

export default authRouter