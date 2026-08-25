const crypto = require('crypto')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const { deleteExpiredRefreshTokens } = require('../../infrastructure/maintenance/auth-token')
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
const findOAuthAccount = async ({ provider, providerAccountId }) => prisma.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } }, include: { user: { include: userInclude } } })
const createOAuthUser = async ({ email, provider, providerAccountId, roleName }) => prisma.$transaction(async (tx) => {
  const role = await tx.role.findUnique({ where: { name: roleName } })
  if (!role) throw new Error(`OAuth default role '${roleName}' does not exist.`)
  if (await tx.user.findUnique({ where: { email } })) throw new Error('An account already exists for this email address.')
  return tx.user.create({ data: { email, passwordHash: null, roleId: role.id, oauthAccounts: { create: { provider, providerAccountId } } }, include: userInclude })
})
const linkOAuthAccount = async ({ userId, provider, providerAccountId }) => {
  const existingAccount = await prisma.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } } })
  if (existingAccount) { if (existingAccount.userId === Number(userId)) return existingAccount; const error = new Error('This OAuth account is already linked to another user.'); error.code = 'OAUTH_ACCOUNT_ALREADY_LINKED'; throw error }
  return prisma.oAuthAccount.create({ data: { userId: Number(userId), provider, providerAccountId } })
}
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
module.exports = { findUserByEmail, findUserById, findUserAuthState, findRoleByName, createUser, bumpUserAuthVersion, findOAuthAccount, createOAuthUser, linkOAuthAccount, listOAuthAccounts, unlinkOAuthAccount, hashRefreshToken, createRefreshTokenRecord, findRefreshToken, findRefreshTokenById, revokeRefreshToken, revokeAllRefreshTokensForUser, rotateRefreshToken, deleteExpiredRefreshTokens }
