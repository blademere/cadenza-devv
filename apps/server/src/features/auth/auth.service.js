const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { BadRequestError, NotFoundError, UnauthorizedError } = require('../../common/errors/appError')
const { findUserByEmail, findUserById, hashRefreshToken, createRefreshTokenRecord, findRefreshToken, revokeRefreshToken, revokeAllRefreshTokensForUser, rotateRefreshToken, changePassword: persistPasswordChange, listActiveSessions, revokeSession, bumpUserAuthVersion } = require('./auth.repository')
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require('./auth.tokens')
const { env } = require('../../config')
const getRefreshTokenExpiration = () => {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error('JWT_REFRESH_EXPIRES_IN must use s, m, h, or d format.')
  const milliseconds = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }
  return new Date(Date.now() + Number(match[1]) * milliseconds[match[2]])
}
const createTokenId = () => crypto.randomUUID()
const login = async ({ email, password }) => {
  const user = await findUserByEmail(email)
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials.')
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedError('Invalid credentials.')
  const tokenId = createTokenId()
  const accessToken = createAccessToken(user)
  const refreshToken = createRefreshToken(user, tokenId)
  await createRefreshTokenRecord({ tokenId, token: refreshToken, userId: user.id, expiresAt: getRefreshTokenExpiration() })
  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role ? { id: user.role.id, name: user.role.name, description: user.role.description } : null } }
}
const changePassword = async ({ userId, currentPassword, newPassword }) => {
  if (currentPassword === newPassword) throw new BadRequestError('New password must be different from the current password.')
  const user = await findUserById(userId)
  if (!user || !user.isActive) throw new UnauthorizedError('User account is unavailable.')
  if (!user.passwordHash) throw new BadRequestError('Password authentication is not configured for this account.')
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new UnauthorizedError('Current password is incorrect.')
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await persistPasswordChange({ userId: user.id, passwordHash })
  return { success: true }
}
const getSessions = async ({ userId }) => listActiveSessions(userId)
const revokeSessionById = async ({ userId, sessionId }) => {
  const result = await revokeSession({ userId, sessionId })
  if (result.count !== 1) throw new NotFoundError('Session not found or already revoked.')
  return { success: true }
}
const revokeAllSessions = async ({ userId }) => {
  await bumpUserAuthVersion(userId)
  return { success: true }
}
const refreshAccessToken = async ({ refreshToken }) => {
  let payload
  try { payload = verifyRefreshToken(refreshToken) } catch { throw new UnauthorizedError('Refresh token is invalid or expired.') }
  if (payload.type !== 'refresh' || !payload.sub || !payload.tokenId || !Number.isInteger(payload.authVersion) || payload.authVersion < 0) throw new UnauthorizedError('Refresh token is invalid.')
  const userId = Number(payload.sub)
  if (!Number.isInteger(userId) || userId <= 0) throw new UnauthorizedError('Refresh token is invalid.')
  const storedToken = await findRefreshToken(refreshToken)
  if (!storedToken || storedToken.id !== payload.tokenId || storedToken.userId !== userId) throw new UnauthorizedError('Refresh token is invalid.')
  if (storedToken.user.authVersion !== payload.authVersion) { await revokeAllRefreshTokensForUser(storedToken.userId); throw new UnauthorizedError('Refresh token has been revoked.') }
  if (storedToken.revokedAt) { await revokeAllRefreshTokensForUser(storedToken.userId); throw new UnauthorizedError('Refresh token has already been used.') }
  if (storedToken.expiresAt <= new Date()) throw new UnauthorizedError('Refresh token is expired.')
  if (!storedToken.user.isActive) throw new UnauthorizedError('User account is inactive.')
  const newTokenId = createTokenId()
  const newRefreshToken = createRefreshToken(storedToken.user, newTokenId)
  const rotation = await rotateRefreshToken({ currentTokenId: storedToken.id, newTokenId, newTokenHash: hashRefreshToken(newRefreshToken), userId: storedToken.user.id, expiresAt: getRefreshTokenExpiration() })
  if (!rotation.success) { await revokeAllRefreshTokensForUser(storedToken.userId); throw new UnauthorizedError('Refresh token has already been used.') }
  return { accessToken: createAccessToken(storedToken.user), refreshToken: newRefreshToken }
}
const logout = async ({ refreshToken }) => {
  if (!refreshToken) return
  let payload
  try { payload = verifyRefreshToken(refreshToken) } catch { return }
  if (payload.type !== 'refresh' || !payload.tokenId) return
  const storedToken = await findRefreshToken(refreshToken)
  if (!storedToken || storedToken.id !== payload.tokenId || storedToken.revokedAt) return
  await revokeRefreshToken(storedToken.id)
}
module.exports = { login, changePassword, getSessions, revokeSessionById, revokeAllSessions, refreshAccessToken, logout }
