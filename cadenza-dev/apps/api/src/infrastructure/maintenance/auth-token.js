import { getPrismaClient } from '../database/prisma.js'

const prisma = getPrismaClient()

const deleteExpiredRefreshTokens = async () =>
  prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })

export { deleteExpiredRefreshTokens }
