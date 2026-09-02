const prisma = require('../../infrastructure/database/prisma')

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'accesstoken',
  'refreshtoken',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'clientsecret',
  'secret',
  'apikey',
])

const sanitizeJson = (value) => {
  if (value === undefined || value === null) return value
  if (Array.isArray(value)) return value.map(sanitizeJson)
  if (typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : sanitizeJson(entry),
    ])
  )
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
    throw new TypeError('Audit action, entityType, and entityId are required.')
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
  sanitizeJson,
}
