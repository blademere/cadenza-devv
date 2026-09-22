import { successResponse } from '../../common/responses/apiResponse.js'
import { login, requestPasswordReset, resetPassword, changePassword, getSessions, revokeSessionById, revokeAllSessions, refreshAccessToken, logout } from './auth.service.js'
import { registerUser } from './registration.service.js'
import { issueEmailVerification, verifyEmail } from './email-verification.service.js'
import { findUserById } from './auth.repository.js'
import { setCsrfCookie } from '../../common/middleware/csrf.js'
import { UnauthorizedError } from '../../common/errors/appError.js'
import { env } from '../../config/index.js'

const refreshCookieOptions = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, domain: env.COOKIE_DOMAIN || undefined, path: '/api/v1/auth', maxAge: env.COOKIE_REFRESH_MAX_AGE_MS }
const clearRefreshCookie = (res) => res.clearCookie('refreshToken', { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, domain: env.COOKIE_DOMAIN || undefined, path: '/api/v1/auth' })
const toPublicUser = (user) => ({ id: user.id, email: user.email, emailVerified: Boolean(user.emailVerifiedAt) })
const csrfTokenController = async (_req, res) => successResponse(res, 'CSRF token issued.', { csrfToken: setCsrfCookie(res) })
const registerUserController = async (req, res) => successResponse(res, 'User account created successfully. Please verify your email address.', { user: await registerUser(req.validated.body) }, 201)
const loginController = async (req, res) => { const result = await login(req.validated.body); res.cookie('refreshToken', result.refreshToken, refreshCookieOptions); return successResponse(res, 'Login successful.', { accessToken: result.accessToken, csrfToken: setCsrfCookie(res), user: result.user }, 200) }
const requestPasswordResetController = async (req, res) => { await requestPasswordReset(req.validated.body); return successResponse(res, 'If an active account exists for that email, password reset instructions will be sent.', null, 202) }
const resetPasswordController = async (req, res) => { await resetPassword(req.validated.body); return successResponse(res, 'Password reset successfully. Please sign in again.', null, 200) }
const currentUserController = async (req, res) => { const user = await findUserById(req.user.id); if (!user || !user.isActive) throw new UnauthorizedError('User account is unavailable.'); return successResponse(res, 'Current user retrieved.', { user: toPublicUser(user) }) }
const changePasswordController = async (req, res) => { await changePassword({ userId: req.user.id, ...req.validated.body }); clearRefreshCookie(res); res.clearCookie('csrfToken', { secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, domain: env.COOKIE_DOMAIN || undefined, path: '/' }); return successResponse(res, 'Password changed successfully. Please sign in again.', null, 200) }
const listSessionsController = async (req, res) => successResponse(res, 'Active sessions retrieved.', { sessions: await getSessions({ userId: req.user.id }) })
const revokeSessionController = async (req, res) => successResponse(res, 'Session revoked successfully.', await revokeSessionById({ userId: req.user.id, sessionId: req.validated.params.id }))
const revokeAllSessionsController = async (req, res) => { await revokeAllSessions({ userId: req.user.id }); clearRefreshCookie(res); res.clearCookie('csrfToken', { secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, domain: env.COOKIE_DOMAIN || undefined, path: '/' }); return successResponse(res, 'All sessions revoked successfully.', null, 200) }
const refreshAccessTokenController = async (req, res) => { const refreshToken = req.cookies?.refreshToken; if (!refreshToken) throw new UnauthorizedError('Refresh token is missing.'); const result = await refreshAccessToken({ refreshToken }); res.cookie('refreshToken', result.refreshToken, refreshCookieOptions); return successResponse(res, 'Access token refreshed.', { accessToken: result.accessToken }) }
const logoutController = async (req, res) => { await logout({ refreshToken: req.cookies?.refreshToken }); clearRefreshCookie(res); res.clearCookie('csrfToken', { secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE, domain: env.COOKIE_DOMAIN || undefined, path: '/' }); return successResponse(res, 'Logout successful.', null, 200) }
const verifyEmailController = async (req, res) => { await verifyEmail(req.validated.body); return successResponse(res, 'Email address verified successfully.', null, 200) }
const requestEmailVerificationController = async (req, res) => { await issueEmailVerification({ userId: req.user.id, reason: 'resend' }); return successResponse(res, 'If your account requires email verification, a verification email will be sent.', null, 202) }

export { csrfTokenController, registerUserController, loginController, requestPasswordResetController, resetPasswordController, currentUserController, changePasswordController, listSessionsController, revokeSessionController, revokeAllSessionsController, refreshAccessTokenController, logoutController, verifyEmailController, requestEmailVerificationController }
