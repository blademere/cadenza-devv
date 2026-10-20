import { UnauthorizedError } from '../../../../common/errors/appError.js';
import { successResponse } from '../../../../common/responses/apiResponse.js';
import { env } from '../../../../config/index.js';
import { setCsrfCookie } from '../../../../common/middleware/csrf.js';
import {
  getCurrentUser,
  login,
  logout,
  refreshAccessToken,
} from '../../../cadenza-client/features/auth/auth.service.js';
import { loginWithGoogleIdToken } from './google-auth.service.js';

const refreshCookiePath = '/api/v1/cadenza-mobile/auth';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN || undefined,
  path: refreshCookiePath,
  maxAge: env.COOKIE_REFRESH_MAX_AGE_MS,
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: refreshCookiePath,
  });
};

const csrfController = async (_req, res) => {
  return successResponse(res, 'CSRF token issued.', {
    csrfToken: setCsrfCookie(res),
  });
};

const sendLoginResponse = (res, result, message = 'Login successful.') => {
  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

  return successResponse(res, message, {
    accessToken: result.accessToken,
    csrfToken: setCsrfCookie(res),
    user: result.user,
    account: result.account,
  });
};

const loginController = async (req, res) => {
  const result = await login(req.body, { requireActiveEnrollment: true });
  return sendLoginResponse(res, result);
};

const googleLoginController = async (req, res) => {
  const { idToken } = req.body ?? {};

  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw new UnauthorizedError('A valid Google ID token is required.');
  }

  const result = await loginWithGoogleIdToken({ idToken });
  return sendLoginResponse(res, result, 'Google sign-in successful.');
};

const currentUserController = async (req, res) => {
  const result = await getCurrentUser(req.user.id, {
    requireActiveEnrollment: true,
  });

  return successResponse(res, 'Current user retrieved.', result);
};

const refreshController = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is missing.');
  }

  const result = await refreshAccessToken({
    refreshToken,
    requireActiveEnrollment: true,
  });

  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

  return successResponse(res, 'Access token refreshed.', {
    accessToken: result.accessToken,
    account: result.account,
  });
};

const logoutController = async (req, res) => {
  await logout({ refreshToken: req.cookies?.refreshToken });
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
  loginController,
  googleLoginController,
  currentUserController,
  refreshController,
  logoutController,
};
