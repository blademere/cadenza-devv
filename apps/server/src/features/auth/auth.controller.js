const { successResponse } = require('../../common/responses/apiResponse')
const { login, refreshAccessToken, logout } = require('./auth.service')
const { registerUser } = require('./user-registration')
const { findUserById } = require('./auth.repository')
const { setCsrfCookie } = require('../../common/middleware/csrf')
const { UnauthorizedError } = require('../../common/errors/appError')
const { env } = require('../../config')

const refreshCookieOptions = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, domain: env.COOKIE_DOMAIN || undefined, path: '/api/v1/auth', maxAge: env.COOKIE_REFRESH_MAX_AGE_MS }
const clearRefreshCookie = (res) => res.clearCookie('refreshToken', { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, domain: env.COOKIE_DOMAIN || undefined, path: '/api/v1/auth' })
const toPublicUser = (user) => ({ id: user.id, email: user.email, role: user.role ? { id: user.role.id, name: user.role.name, description: user.role.description } : null })
const csrfTokenController = async (_req, res) => successResponse(res, 'CSRF token issued.', { csrfToken: setCsrfCookie(res) })
const registerUserController = async (req, res) => successResponse(res, 'User account created successfully.', { user: await registerUser(req.validated.body) }, 201)
const loginController = async (req, res) => { const result = await login(req.validated.body); res.cookie('refreshToken', result.refreshToken, refreshCookieOptions); return successResponse(res, 'Login successful.', { accessToken: result.accessToken, csrfToken: setCsrfCookie(res), user: result.user }, 200) }
const currentUserController = async (req, res) => { const user = await findUserById(req.user.id); if (!user || !user.isActive) throw new UnauthorizedError('User account is unavailable.'); return successResponse(res, 'Current user retrieved.', { user: toPublicUser(user) }) }
const refreshAccessTokenController = async (req, res) => { const refreshToken = req.cookies?.refreshToken; if (!refreshToken) throw new UnauthorizedError('Refresh token is missing.'); const result = await refreshAccessToken({ refreshToken }); res.cookie('refreshToken', result.refreshToken, refreshCookieOptions); return successResponse(res, 'Access token refreshed.', { accessToken: result.accessToken }) }
const logoutController = async (req, res) => { await logout({ refreshToken: req.cookies?.refreshToken }); clearRefreshCookie(res); res.clearCookie('csrfToken', { secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, domain: env.COOKIE_DOMAIN || undefined, path: '/' }); return successResponse(res, 'Logout successful.', null, 200) }
module.exports = { csrfTokenController, registerUserController, loginController, currentUserController, refreshAccessTokenController, logoutController }
