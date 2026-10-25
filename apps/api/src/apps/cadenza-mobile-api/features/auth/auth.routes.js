import express from 'express';

import {
  asyncHandler,
  idempotency,
  loginRateLimiter,
  logoutRateLimiter,
  refreshRateLimiter,
} from '../../../../common/middleware/index.js';
import { csrfProtection } from '../../../../common/middleware/csrf.js';
import cadenzaAuthenticate from '../../../cadenza-client/features/auth/authenticate.js';
import requireActiveEnrollment from '../../middleware/require-active-enrollment.js';

import {
  csrfController,
  loginController,
  googleLoginController,
  currentUserController,
  refreshController,
  logoutController,
} from './auth.controller.js';

const authRouter = express.Router();

const requireAuthIdempotency = idempotency({
  scope: 'cadenza-mobile-auth',
  required: true,
});

authRouter.get('/csrf', asyncHandler(csrfController));
authRouter.post('/login', loginRateLimiter, asyncHandler(loginController));
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
