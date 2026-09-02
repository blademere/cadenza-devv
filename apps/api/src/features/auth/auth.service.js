import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../common/errors/appError.js'
import { findUserByEmail, findUserById, hashRefreshToken, createRefreshTokenRecord, findRefreshToken, revokeRefreshToken, revokeAllRefreshTokensForUser, rotateRefreshToken, changePassword as persistPasswordChange, listActiveSessions, revokeSession, bumpUserAuthVersion, createPasswordResetToken, findPasswordResetToken, consumePasswordResetToken, invalidatePasswordResetTokens } from './auth.repository.js'
import { createAccessToken, createRefreshToken, verifyRefreshToken } from './auth.tokens.js'
import { publish } from '../../platform/event-bus/event-bus.js'
import { env } from '../../config/index.js'

const getRefreshTokenExpiration = () => {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error('JWT_REFRESH_EXPIRES_IN must use s, m, h, or d format.')
  const milliseconds = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }
  return new Date(Date.now() + Number(match[1]) * milliseconds[match[2]])
}
const createTokenId = () => crypto.randomUUID()
const createPasswordResetSecret = () => crypto.randomBytes(32).toString('base64url')
const getPasswordResetExpiration = () => new Date(Date.now() + 30 * 60 * 1000)
const passwordResetKey = () => crypto.createHash('sha256').update(env.JWT_REFRESH_SECRET).digest()
const encryptPasswordResetSecret = (secret) => {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', passwordResetKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`
}
const decryptPasswordResetSecret = (value) => {
  try {
    const [iv, tag, ciphertext] = String(value).split('.').map((part) => Buffer.from(part, 'base64url'))
    if (!iv || !tag || !ciphertext || iv.length !== 12 || tag.length !== 16) throw new Error('invalid token')
    const decipher = crypto.createDecipheriv('aes-256-gcm', passwordResetKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new UnauthorizedError('Password reset token is invalid or expired.')
  }
}
const login = async ({ email, password }) => {
  const user = await findUserByEmail(email)
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials.')
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedError('Invalid credentials.')
  const tokenId = createTokenId()
  const accessToken = createAccessToken(user)
  const refreshToken = createRefreshToken(user, tokenId)
  await createRefreshTokenRecord({ tokenId, token: refreshToken, userId: user.id, expiresAt: getRefreshTokenExpiration() })
  await publish({ event: 'auth.session.created', entityType: 'User', entityId: user.id, actorId: user.id, context: { user: { id: user.id, email: user.email } }, idempotencyKey: `auth.session.created:${tokenId}` })
  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role ? { id: user.role.id, name: user.role.name, description: user.role.description } : null } }
}
const requestPasswordReset = async ({ email }) => {
  const user = await findUserByEmail(email)
  if (user?.isActive && user.passwordHash) {
    await invalidatePasswordResetTokens(user.id)
    const token = createPasswordResetSecret()
    const expiresAt = getPasswordResetExpiration()
    const encryptedToken = encryptPasswordResetSecret(token)
    await createPasswordResetToken({ token, userId: user.id, expiresAt })
    await publish({ event: 'auth.user.password_reset_requested', entityType: 'User', entityId: user.id, context: { user: { id: user.id, email: user.email }, passwordReset: { url: `${env.PASSWORD_RESET_URL}${encodeURIComponent(encryptedToken)}`, expiresAt: expiresAt.toISOString() } }, idempotencyKey: `auth.password-reset.requested:${user.id}:${Date.now()}` })
    if (env.NODE_ENV === 'test') return { token: encryptedToken }
  }
  return { success: true }
}
const resetPassword = async ({ token, newPassword }) => {
  const plaintextToken = decryptPasswordResetSecret(token)
  const stored = await findPasswordResetToken(plaintextToken)
  if (!stored || stored.usedAt || stored.expiresAt <= new Date() || !stored.user?.isActive) throw new UnauthorizedError('Password reset token is invalid or expired.')
  const passwordHash = await bcrypt.hash(newPassword, 12)
  const result = await consumePasswordResetToken({ tokenId: stored.id, userId: stored.userId, passwordHash })
  if (!result.success) throw new UnauthorizedError('Password reset token is invalid or expired.')
  await publish({ event: 'auth.user.password_reset', entityType: 'User', entityId: stored.userId, context: { user: { id: stored.userId, email: stored.user.email } }, idempotencyKey: `auth.password-reset.completed:${stored.id}` })
  return { success: true }
}
const changePassword = async ({ userId, currentPassword, newPassword }) => {
  if (currentPassword === newPassword) throw new BadRequestError('New password must be different from the current password.')
  const user = await findUserById(userId)
  if (!user || !user.isActive) throw new UnauthorizedError('User account is unavailable.')
  if (!user.passwordHash) throw new BadRequestError('Password authentication is not configured for this account.')
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new UnauthorizedError('Current password is incorrect.')
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await persistPasswordChange({ userId: user.id, passwordHash })
  await publish({ event: 'auth.user.password_changed', entityType: 'User', entityId: user.id, actorId: user.id, context: { user: { id: user.id, email: user.email }, }, idempotencyKey: `auth.password-changed:${user.id}:${user.authVersion + 1}` })
  return { success: true }
}
const getSessions = async ({ userId }) => listActiveSessions(userId)
const revokeSessionById = async ({ userId, sessionId }) => { const result = await revokeSession({ userId, sessionId }); if (result.count !== 1) throw new NotFoundError('Session not found or already revoked.'); await publish({ event: 'auth.session.revoked', entityType: 'RefreshToken', entityId: sessionId, actorId: userId, context: { user: { id: userId } }, idempotencyKey: `auth.session.revoked:${sessionId}` }); return { success: true } }
const revokeAllSessions = async ({ userId }) => { await bumpUserAuthVersion(userId); await publish({ event: 'auth.session.revoked_all', entityType: 'User', entityId: userId, actorId: userId, context: { user: { id: userId } }, idempotencyKey: `auth.session.revoked-all:${userId}:${Date.now()}` }); return { success: true } }
const refreshAccessToken = async ({ refreshToken }) => {
  let payload
  try { payload = verifyRefreshToken(refreshToken) } catch { throw new UnauthorizedError('Refresh token is invalid or expired.') }
  if (payload.type !== 'refresh' || !payload.sub || !payload.tokenId || !Number.isInteger(payload.authVersion) || payload.authVersion < 0) throw new UnauthorizedError('Refresh token is invalid.')
  const userId = Number(payload.sub)
  if (!Number.isInteger(userId) || userId <= 0) throw new UnauthorizedError('Refresh token is invalid.')
  const storedToken = await findRefreshToken(refreshToken)
  if (!storedToken || storedToken.id !== payload.tokenId || storedToken.userId !== userId) throw new UnauthorizedError('Refresh token is invalid.')
  if (storedToken.user.authVersion !== payload.authVersion) { await revokeAllRefreshTokensForUser(storedToken.userId); throw new UnauthorizedError('Refresh token has been revoked.') }
  if (storedToken.revokedAt) { await revokeAllRefreshTokensForUser(storedToken.userId); await publish({ event: 'auth.session.reuse_detected', entityType: 'RefreshToken', entityId: storedToken.id, actorId: storedToken.userId, context: { user: { id: storedToken.userId } }, idempotencyKey: `auth.session.reuse:${storedToken.id}` }); throw new UnauthorizedError('Refresh token has already been used.') }
  if (storedToken.expiresAt <= new Date()) throw new UnauthorizedError('Refresh token is expired.')
  if (!storedToken.user.isActive) throw new UnauthorizedError('User account is inactive.')
  const newTokenId = createTokenId()
  const newRefreshToken = createRefreshToken(storedToken.user, newTokenId)
  const rotation = await rotateRefreshToken({ currentTokenId: storedToken.id, newTokenId, newTokenHash: hashRefreshToken(newRefreshToken), userId: storedToken.user.id, expiresAt: getRefreshTokenExpiration() })
  if (!rotation.success) { await revokeAllRefreshTokensForUser(storedToken.userId); await publish({ event: 'auth.session.reuse_detected', entityType: 'RefreshToken', entityId: storedToken.id, actorId: storedToken.userId, context: { user: { id: storedToken.userId } }, idempotencyKey: `auth.session.reuse:${storedToken.id}:race` }); throw new UnauthorizedError('Refresh token has already been used.') }
  return { accessToken: createAccessToken(storedToken.user), refreshToken: newRefreshToken }
}
const logout = async ({ refreshToken }) => { if (!refreshToken) return; let payload; try { payload = verifyRefreshToken(refreshToken) } catch { return }; if (payload.type !== 'refresh' || !payload.tokenId) return; const storedToken = await findRefreshToken(refreshToken); if (!storedToken || storedToken.id !== payload.tokenId || storedToken.revokedAt) return; await revokeRefreshToken(storedToken.id); await publish({ event: 'auth.session.revoked', entityType: 'RefreshToken', entityId: storedToken.id, actorId: storedToken.userId, context: { user: { id: storedToken.userId } }, idempotencyKey: `auth.session.logout:${storedToken.id}` }) }

export { login, requestPasswordReset, resetPassword, changePassword, getSessions, revokeSessionById, revokeAllSessions, refreshAccessToken, logout }
