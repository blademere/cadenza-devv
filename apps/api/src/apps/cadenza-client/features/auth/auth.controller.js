import { successResponse } from '../../../../common/responses/apiResponse.js';
import {
  login,
  registerClient,
  refreshAccessToken,
  logout,
  getCurrentUser,
  requestEmailOtp,
  verifyEmailOtp,
} from './auth.service.js';
import { requestPasswordReset, resetPassword } from '../../../../features/auth/auth.service.js';

import { setCsrfCookie } from '../../../../common/middleware/csrf.js';
import { NotFoundError, UnauthorizedError } from '../../../../common/errors/appError.js';
import { env } from '../../../../config/index.js';

const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/api/v1/cadenza-client/auth',
  maxAge: env.COOKIE_REFRESH_MAX_AGE_MS,
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/v1/cadenza-client/auth',
  });
};

const csrfController = async (_req, res) => {
  return successResponse(res, 'CSRF token issued.', {
    csrfToken: setCsrfCookie(res),
  });
};

const loginController = async (req, res) => {
  const result = await login(req.body);

  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

  return successResponse(res, 'Login successful.', {
    accessToken: result.accessToken,
    csrfToken: setCsrfCookie(res),
    user: result.user,
    account: result.account,
  });
};

const registerController = async (req, res) => {
  const result = await registerClient(req.validated?.body ?? req.body);
  return successResponse(res, 'Client account created successfully.', result, 201);
};

const requestEmailOtpController = async (req, res) => {
  const result = await requestEmailOtp(req.validated?.body ?? req.body);
  return successResponse(res, 'Verification code sent.', result, 202);
};

const verifyEmailOtpController = async (req, res) => {
  const result = await verifyEmailOtp(req.validated?.body ?? req.body);
  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  return successResponse(res, 'Email verified and login successful.', {
    accessToken: result.accessToken,
    csrfToken: setCsrfCookie(res),
    user: result.user,
    account: result.account,
  });
};

const requestPasswordResetController = async (req, res) => {
  const result = await requestPasswordReset(req.validated?.body ?? req.body);
  if (!result.found) throw new NotFoundError('No user found.');
  return successResponse(res, 'Password reset instructions have been sent to your email.', null, 202);
};

const resetPasswordController = async (req, res) => {
  await resetPassword(req.validated?.body ?? req.body);
  return successResponse(res, 'Password reset successfully. Please sign in again.');
};

const currentUserController = async (req, res) => {
  const result = await getCurrentUser(req.user.id);

  return successResponse(res, 'Current user retrieved.', result);
};

const refreshController = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is missing.');
  }

  const result = await refreshAccessToken({
    refreshToken,
  });

  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

  return successResponse(res, 'Access token refreshed.', {
    accessToken: result.accessToken,
    account: result.account,
  });
};

const logoutController = async (req, res) => {
  await logout({
    refreshToken: req.cookies?.refreshToken,
  });

  clearRefreshCookie(res);

  res.clearCookie('csrfToken', {
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });

  return successResponse(res, 'Logout successful.', null, 200);
};

export {
  csrfController,
  registerController,
  loginController,
  currentUserController,
  refreshController,
  logoutController,
  requestEmailOtpController,
  verifyEmailOtpController,
  requestPasswordResetController,
  resetPasswordController,
};
