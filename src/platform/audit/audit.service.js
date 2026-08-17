const prisma = require("../../infrastructure/database/prisma")

const sanitizeJson = (value) => {
  if (value === undefined) return undefined
  return value === null ? null : JSON.parse(JSON.stringify(value))
}

const recordAudit = async ({
  actorId = null,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
  ipAddress,
  userAgent,
  db = prisma,
}) => {
  if (!action || !entityType || !entityId) {
    throw new TypeError("Audit action, entityType, and entityId are required.")
  }

  return db.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId: String(entityId),
      before: sanitizeJson(before),
      after: sanitizeJson(after),
      metadata: sanitizeJson(metadata),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  })
}

module.exports = {
  recordAudit,
}
