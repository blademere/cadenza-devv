import crypto from 'node:crypto'
import { getPrismaClient } from '../../infrastructure/database/prisma.js'
import { deleteExpiredRefreshTokens } from '../../infrastructure/maintenance/auth-token.js'

const prisma = getPrismaClient()
const userInclude = { role: { select: { id: true, name: true, description: true } } }
const findUserByEmail = async (email) => prisma.user.findUnique({ where: { email }, include: userInclude })
const findUserById = async (id) => prisma.user.findUnique({ where: { id: Number(id) }, include: userInclude })
const findUserAuthState = async (id) => prisma.user.findUnique({ where: { id: Number(id) }, select: { id: true, isActive: true, authVersion: true } })
const findRoleByName = async (name) => prisma.role.findUnique({ where: { name }, select: { id: true, name: true, description: true } })
const createUser = async ({ email, roleId, passwordHash }) => prisma.user.create({ data: { email, passwordHash, roleId }, include: userInclude })
const bumpUserAuthVersion = async (userId, { revokeRefreshTokens = true, db = prisma } = {}) => {
  const execute = async (tx) => {
    const user = await tx.user.update({ where: { id: Number(userId) }, data: { authVersion: { increment: 1 } }, select: { id: true, authVersion: true } })
    if (revokeRefreshTokens) await tx.refreshToken.updateMany({ where: { userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
    return user
  }
  return db === prisma ? prisma.$transaction(execute) : execute(db)
}
const changePassword = async ({ userId, passwordHash }) => prisma.$transaction(async (tx) => {
  const user = await tx.user.update({ where: { id: Number(userId) }, data: { passwordHash, authVersion: { increment: 1 } }, select: { id: true, authVersion: true } })
  await tx.refreshToken.updateMany({ where: { userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
  return user
})
const listActiveSessions = async (userId) => prisma.refreshToken.findMany({ where: { userId: Number(userId), revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' } })
const revokeSession = async ({ userId, sessionId }) => prisma.refreshToken.updateMany({ where: { id: sessionId, userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
const findOAuthAccount = async ({ provider, providerAccountId }) => prisma.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } }, include: { user: { include: userInclude } } })
const createOAuthUser = async ({ email, provider, providerAccountId, roleName }) => prisma.$transaction(async (tx) => {
  const role = await tx.role.findUnique({ where: { name: roleName } })
  if (!role) throw new Error(`OAuth default role '${roleName}' does not exist.`)
  if (await tx.user.findUnique({ where: { email } })) throw new Error('An account already exists for this email address.')
  return tx.user.create({ data: { email, passwordHash: null, emailVerifiedAt: new Date(), roleId: role.id, oauthAccounts: { create: { provider, providerAccountId } } }, include: userInclude })
})
const linkOAuthAccount = async ({ userId, provider, providerAccountId }) => prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id: Number(userId) }, select: { id: true, email: true, isActive: true } })
  if (!user) { const error = new Error('User account was not found.'); error.code = 'USER_NOT_FOUND'; throw error }
  if (!user.isActive) { const error = new Error('User account is inactive.'); error.code = 'USER_INACTIVE'; throw error }
  const existingAccount = await tx.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } } })
  if (existingAccount) {
    if (existingAccount.userId === Number(userId)) return { account: existingAccount, user }
    const error = new Error('This OAuth account is already linked to another user.')
    error.code = 'OAUTH_ACCOUNT_ALREADY_LINKED'
    throw error
  }
  const account = await tx.oAuthAccount.create({ data: { userId: Number(userId), provider, providerAccountId } })
  return { account, user }
})
const listOAuthAccounts = async (userId) => prisma.oAuthAccount.findMany({ where: { userId: Number(userId) }, select: { id: true, provider: true, providerAccountId: true, createdAt: true }, orderBy: { createdAt: 'asc' } })
const unlinkOAuthAccount = async ({ userId, provider }) => prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id: Number(userId) }, select: { id: true, passwordHash: true } })
  if (!user) { const error = new Error('User account was not found.'); error.code = 'USER_NOT_FOUND'; throw error }
  const accounts = await tx.oAuthAccount.findMany({ where: { userId: Number(userId) }, select: { id: true, provider: true } })
  const account = accounts.find((item) => item.provider === provider)
  if (!account) { const error = new Error('OAuth account is not linked.'); error.code = 'OAUTH_ACCOUNT_NOT_LINKED'; throw error }
  if (!user.passwordHash && !accounts.some((item) => item.id !== account.id)) { const error = new Error('Cannot unlink the only authentication method on the account.'); error.code = 'LAST_AUTH_METHOD'; throw error }
  await tx.oAuthAccount.delete({ where: { id: account.id } })
  return account
})
const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex')
const createRefreshTokenRecord = async ({ tokenId, token, userId, expiresAt }) => prisma.refreshToken.create({ data: { id: tokenId, tokenHash: hashRefreshToken(token), userId: Number(userId), expiresAt } })
const findRefreshToken = async (token) => prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(token) }, include: { user: { include: userInclude }, replacedByToken: { select: { id: true, revokedAt: true, expiresAt: true } } } })
const findRefreshTokenById = async (tokenId) => prisma.refreshToken.findUnique({ where: { id: tokenId }, include: { user: { include: userInclude }, replacedByToken: { select: { id: true, revokedAt: true, expiresAt: true } } } })
const revokeRefreshToken = async (tokenId) => prisma.refreshToken.updateMany({ where: { id: tokenId, revokedAt: null }, data: { revokedAt: new Date() } })
const revokeAllRefreshTokensForUser = async (userId) => prisma.refreshToken.updateMany({ where: { userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
const rotateRefreshToken = async ({ currentTokenId, newTokenId, newTokenHash, userId, expiresAt }) => prisma.$transaction(async (tx) => {
  await tx.refreshToken.create({ data: { id: newTokenId, tokenHash: newTokenHash, userId: Number(userId), expiresAt } })
  const consumed = await tx.refreshToken.updateMany({ where: { id: currentTokenId, userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date(), replacedByTokenId: newTokenId } })
  return consumed.count === 1 ? { success: true } : { success: false }
})
const createPasswordResetToken = async ({ token, userId, expiresAt }) => prisma.passwordResetToken.create({ data: { tokenHash: hashRefreshToken(token), userId: Number(userId), expiresAt } })
const findPasswordResetToken = async (token) => prisma.passwordResetToken.findUnique({ where: { tokenHash: hashRefreshToken(token) }, include: { user: true } })
const consumePasswordResetToken = async ({ tokenId, userId, passwordHash }) => prisma.$transaction(async (tx) => {
  const consumed = await tx.passwordResetToken.updateMany({ where: { id: tokenId, userId: Number(userId), usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })
  if (consumed.count !== 1) return { success: false }
  await tx.user.update({ where: { id: Number(userId) }, data: { passwordHash, authVersion: { increment: 1 } } })
  await tx.refreshToken.updateMany({ where: { userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
  return { success: true }
})
const invalidatePasswordResetTokens = async (userId) => prisma.passwordResetToken.updateMany({ where: { userId: Number(userId), usedAt: null }, data: { usedAt: new Date() } })
const createEmailVerificationToken = async ({ token, userId, expiresAt }) => prisma.emailVerificationToken.create({ data: { tokenHash: hashRefreshToken(token), userId: Number(userId), expiresAt } })
const findEmailVerificationToken = async (token) => prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashRefreshToken(token) }, include: { user: true } })
const invalidateEmailVerificationTokens = async (userId) => prisma.emailVerificationToken.updateMany({ where: { userId: Number(userId), usedAt: null }, data: { usedAt: new Date() } })
const consumeEmailVerificationToken = async ({ tokenId, userId }) => prisma.$transaction(async (tx) => {
  const consumed = await tx.emailVerificationToken.updateMany({ where: { id: tokenId, userId: Number(userId), usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })
  if (consumed.count !== 1) return { success: false }
  const verified = await tx.user.updateMany({ where: { id: Number(userId), emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } })
  if (verified.count !== 1) return { success: false }
  return { success: true }
})

export { findUserByEmail, findUserById, findUserAuthState, findRoleByName, createUser, bumpUserAuthVersion, changePassword, listActiveSessions, revokeSession, findOAuthAccount, createOAuthUser, linkOAuthAccount, listOAuthAccounts, unlinkOAuthAccount, hashRefreshToken, createRefreshTokenRecord, findRefreshToken, findRefreshTokenById, revokeRefreshToken, revokeAllRefreshTokensForUser, rotateRefreshToken, createPasswordResetToken, findPasswordResetToken, consumePasswordResetToken, invalidatePasswordResetTokens, createEmailVerificationToken, findEmailVerificationToken, invalidateEmailVerificationTokens, consumeEmailVerificationToken, deleteExpiredRefreshTokens }
