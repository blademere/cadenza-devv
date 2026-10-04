import { successResponse } from '../../../../common/responses/apiResponse.js';
import {
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
} from './auth.service.js';

import { setCsrfCookie } from '../../../../common/middleware/csrf.js';
import { UnauthorizedError } from '../../../../common/errors/appError.js';
import { env } from '../../../../config/index.js';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/api/v1/cadenza-client/auth',
  maxAge: env.COOKIE_REFRESH_MAX_AGE_MS,
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
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
  loginController,
  currentUserController,
  refreshController,
  logoutController,
};
