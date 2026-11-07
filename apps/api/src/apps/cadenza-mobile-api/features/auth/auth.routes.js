import express from 'express';

import {
  asyncHandler,
  idempotency,
  loginRateLimiter,
  logoutRateLimiter,
  refreshRateLimiter,
  validate,
} from '../../../../common/middleware/index.js';
import { csrfProtection } from '../../../../common/middleware/csrf.js';
import cadenzaAuthenticate from '../../../cadenza-client/features/auth/authenticate.js';
import requireActiveEnrollment from '../../middleware/require-active-enrollment.js';
import { passwordResetRequestValidator } from '../../../../features/auth/auth.validation.js';
import { requestPasswordResetController } from '../../../cadenza-client/features/auth/auth.controller.js';
import { passwordResetValidator } from '../../../../features/auth/auth.validation.js';

import {
  csrfController,
  loginController,
  googleLoginController,
  currentUserController,
  refreshController,
  logoutController,
  requestPasswordResetCodeController,
  verifyPasswordResetCodeController,
  resetPasswordController,
} from './auth.controller.js';

const authRouter = express.Router();

const requireAuthIdempotency = idempotency({
  scope: 'cadenza-mobile-auth',
  required: true,
});

authRouter.get('/csrf', asyncHandler(csrfController));
authRouter.post('/login', loginRateLimiter, asyncHandler(loginController));
authRouter.post('/password/reset/request', loginRateLimiter, validate(passwordResetRequestValidator), requireAuthIdempotency, asyncHandler(requestPasswordResetController));
authRouter.post('/password/reset/code/request', loginRateLimiter, validate(passwordResetRequestValidator), requireAuthIdempotency, asyncHandler(requestPasswordResetCodeController));
authRouter.post('/password/reset/code/verify', loginRateLimiter, requireAuthIdempotency, asyncHandler(verifyPasswordResetCodeController));
authRouter.post('/password/reset', loginRateLimiter, validate(passwordResetValidator), requireAuthIdempotency, asyncHandler(resetPasswordController));
authRouter.post('/oauth/google', loginRateLimiter, asyncHandler(googleLoginController));
authRouter.get(
  '/me',
  cadenzaAuthenticate,
  requireActiveEnrollment,
  asyncHandler(currentUserController),
);
authRouter.post(
  '/refresh',
  refreshRateLimiter,
  csrfProtection,
  requireAuthIdempotency,
  asyncHandler(refreshController),
);
authRouter.post(
  '/logout',
  logoutRateLimiter,
  csrfProtection,
  requireAuthIdempotency,
  asyncHandler(logoutController),
);

export default authRouter;
