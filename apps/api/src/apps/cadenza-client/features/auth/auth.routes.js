import express from 'express';

import {
  csrfController,
  registerController,
  loginController,
  currentUserController,
  refreshController,
  logoutController,
  requestEmailOtpController,
  verifyEmailOtpController,
} from './auth.controller.js';

import cadenzaAuthenticate from './authenticate.js';

import {
  asyncHandler,
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  idempotency,
  registerRateLimiter,
} from '../../../../common/middleware/index.js';

import { csrfProtection } from '../../../../common/middleware/csrf.js';
import validate from '../../../../common/middleware/validate.js';
import { registrationValidator, emailOtpRequestValidator, emailOtpVerifyValidator } from '../../../../features/auth/auth.validation.js';

const authRouter = express.Router();

const requireAuthIdempotency = idempotency({
  scope: 'cadenza-auth',
  required: true,
});
const requireRegistrationIdempotency = idempotency({
  scope: 'cadenza-registration',
  required: true,
});

authRouter.get('/csrf', asyncHandler(csrfController));

authRouter.post(
  '/register',
  registerRateLimiter,
  validate(registrationValidator),
  requireRegistrationIdempotency,
  asyncHandler(registerController),
);

authRouter.post('/login', loginRateLimiter, asyncHandler(loginController));

authRouter.post('/otp/request', loginRateLimiter, validate(emailOtpRequestValidator), requireRegistrationIdempotency, asyncHandler(requestEmailOtpController));
authRouter.post('/otp/verify', loginRateLimiter, validate(emailOtpVerifyValidator), requireRegistrationIdempotency, asyncHandler(verifyEmailOtpController));

authRouter.get('/me', cadenzaAuthenticate, asyncHandler(currentUserController));

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
