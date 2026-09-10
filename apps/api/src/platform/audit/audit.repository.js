import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

export const createAuditLog = (data) => prisma.auditLog.create({ data })
