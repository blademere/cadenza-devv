const { getPrismaClient } = require('../database/prisma')

const prisma = getPrismaClient()

const deleteExpiredRefreshTokens = async () =>
  prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })

module.exports = { deleteExpiredRefreshTokens }
