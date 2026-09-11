import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

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

const recordAuthorizationDenied = async ({
  actorId,
  resource,
  action,
  resourceId = null,
  ipAddress = null,
  userAgent = null,
  requestId = null,
  correlationId = null,
  reason = 'permission_denied',
}) => {
  try {
    const entityId = resourceId == null
      ? `${String(resource)}:${String(action)}`
      : String(resourceId)

    return await recordAudit({
      actorId,
      action: 'AUTHORIZATION_DENIED',
      entityType: String(resource),
      entityId,
      metadata: {
        authorizationAction: String(action),
        reason,
        requestId,
        correlationId,
      },
      ipAddress,
      userAgent,
    })
  } catch {
    // Authorization failures must remain fail-closed even when the audit store
    // is unavailable. The denial metric/logging path remains independent.
    return null
  }
}

export {
  recordAudit,
  recordAuthorizationDenied,
  sanitizeJson,
}
