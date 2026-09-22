import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const createAuditLog = (data, db = prisma) => db.auditLog.create({ data })

export {
  createAuditLog,
}
