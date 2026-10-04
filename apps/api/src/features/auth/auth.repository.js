import { getPrismaClient } from '../../infrastructure/database/prisma.js'
import { run as runTransaction } from '../../platform/transactions/transaction.service.js'

const prisma = getPrismaClient()
const findUserByEmail = async (email, db = prisma) => db.user.findUnique({ where: { email } })
const findUserById = async (id, db = prisma) => db.user.findUnique({ where: { id: Number(id) } })
const findUserAuthState = async (id, db = prisma) => db.user.findUnique({ where: { id: Number(id) }, select: { id: true, isActive: true, authVersion: true } })
const createUser = async ({ email, passwordHash, emailVerifiedAt = undefined }, db = prisma) => db.user.create({ data: { email, passwordHash, emailVerifiedAt } })
const bumpUserAuthVersion = async (userId, { revokeRefreshTokens = true, db = prisma } = {}) => {
  const execute = async (tx) => {
    const user = await tx.user.update({ where: { id: Number(userId) }, data: { authVersion: { increment: 1 } }, select: { id: true, authVersion: true } })
    if (revokeRefreshTokens) await tx.refreshToken.updateMany({ where: { userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
    return user
  }
  return db === prisma ? runTransaction(execute) : execute(db)
}
const changePassword = async ({ userId, passwordHash }) => runTransaction(async (tx) => {
  const user = await tx.user.update({ where: { id: Number(userId) }, data: { passwordHash, authVersion: { increment: 1 } }, select: { id: true, authVersion: true } })
  await tx.refreshToken.updateMany({ where: { userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
  return user
})
const listActiveSessions = async (userId) => prisma.refreshToken.findMany({ where: { userId: Number(userId), revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' } })
const revokeSession = async ({ userId, sessionId }) => prisma.refreshToken.updateMany({ where: { id: sessionId, userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
const findOAuthAccount = async ({ provider, providerAccountId }, db = prisma) => db.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } }, include: { user: true } })
const createOAuthAccount = async ({ userId, provider, providerAccountId }, db = prisma) => db.oAuthAccount.create({ data: { userId: Number(userId), provider, providerAccountId } })
const listOAuthAccounts = async (userId, db = prisma) => db.oAuthAccount.findMany({ where: { userId: Number(userId) }, select: { id: true, provider: true, providerAccountId: true, createdAt: true }, orderBy: { createdAt: 'asc' } })
const findOAuthAccountByUserAndProvider = async ({ userId, provider }, db = prisma) => db.oAuthAccount.findFirst({ where: { userId: Number(userId), provider }, select: { id: true, provider: true, providerAccountId: true, createdAt: true } })
const deleteOAuthAccount = async (accountId, db = prisma) => db.oAuthAccount.delete({ where: { id: accountId } })
const countOAuthAccounts = async (userId, db = prisma) => db.oAuthAccount.count({ where: { userId: Number(userId) } })
const createRefreshTokenRecord = async ({ tokenId, tokenHash, userId, expiresAt }, db = prisma) => db.refreshToken.create({ data: { id: tokenId, tokenHash, userId: Number(userId), expiresAt } })
const findRefreshToken = async (tokenHash, db = prisma) => db.refreshToken.findUnique({ where: { tokenHash }, include: { user: true, replacedByToken: { select: { id: true, revokedAt: true, expiresAt: true } } } })
const findRefreshTokenById = async (tokenId, db = prisma) => db.refreshToken.findUnique({ where: { id: tokenId }, include: { user: true, replacedByToken: { select: { id: true, revokedAt: true, expiresAt: true } } } })
const revokeRefreshToken = async (tokenId) => prisma.refreshToken.updateMany({ where: { id: tokenId, revokedAt: null }, data: { revokedAt: new Date() } })
const revokeAllRefreshTokensForUser = async (userId) => prisma.refreshToken.updateMany({ where: { userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
const rotateRefreshToken = async ({ currentTokenId, newTokenId, newTokenHash, userId, expiresAt }) => runTransaction(async (tx) => {
  await tx.refreshToken.create({ data: { id: newTokenId, tokenHash: newTokenHash, userId: Number(userId), expiresAt } })
  const consumed = await tx.refreshToken.updateMany({ where: { id: currentTokenId, userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date(), replacedByTokenId: newTokenId } })
  return consumed.count === 1 ? { success: true } : { success: false }
})
const createPasswordResetToken = async ({ tokenHash, userId, expiresAt }, db = prisma) => db.passwordResetToken.create({ data: { tokenHash, userId: Number(userId), expiresAt } })
const findPasswordResetToken = async (tokenHash, db = prisma) => db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } })
const consumePasswordResetToken = async ({ tokenId, userId, passwordHash }) => runTransaction(async (tx) => {
  const consumed = await tx.passwordResetToken.updateMany({ where: { id: tokenId, userId: Number(userId), usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })
  if (consumed.count !== 1) return { success: false }
  await tx.user.update({ where: { id: Number(userId) }, data: { passwordHash, authVersion: { increment: 1 } } })
  await tx.refreshToken.updateMany({ where: { userId: Number(userId), revokedAt: null }, data: { revokedAt: new Date() } })
  return { success: true }
})
const invalidatePasswordResetTokens = async (userId, db = prisma) => db.passwordResetToken.updateMany({ where: { userId: Number(userId), usedAt: null }, data: { usedAt: new Date() } })
const createEmailVerificationToken = async ({ tokenHash, userId, expiresAt }, db = prisma) => db.emailVerificationToken.create({ data: { tokenHash, userId: Number(userId), expiresAt } })
const findEmailVerificationToken = async (tokenHash, db = prisma) => db.emailVerificationToken.findUnique({ where: { tokenHash }, include: { user: true } })
const invalidateEmailVerificationTokens = async (userId, db = prisma) => db.emailVerificationToken.updateMany({ where: { userId: Number(userId), usedAt: null }, data: { usedAt: new Date() } })
const consumeEmailVerificationToken = async ({ tokenId, userId }) => runTransaction(async (tx) => {
  const consumed = await tx.emailVerificationToken.updateMany({ where: { id: tokenId, userId: Number(userId), usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })
  if (consumed.count !== 1) return { success: false }
  const verified = await tx.user.updateMany({ where: { id: Number(userId), emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } })
  if (verified.count !== 1) return { success: false }
  return { success: true }
})
export {
  findUserByEmail,
  findUserById,
  findUserAuthState,
  createUser,
  bumpUserAuthVersion,
  changePassword,
  listActiveSessions,
  revokeSession,
  findOAuthAccount,
  createOAuthAccount,
  listOAuthAccounts,
  findOAuthAccountByUserAndProvider,
  deleteOAuthAccount,
  countOAuthAccounts,
  createRefreshTokenRecord,
  findRefreshToken,
  findRefreshTokenById,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  rotateRefreshToken,
  createPasswordResetToken,
  findPasswordResetToken,
  consumePasswordResetToken,
  invalidatePasswordResetTokens,
  createEmailVerificationToken,
  findEmailVerificationToken,
  invalidateEmailVerificationTokens,
  consumeEmailVerificationToken,
}
