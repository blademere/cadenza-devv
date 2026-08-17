const { randomUUID } = require("node:crypto")
const prisma = require("../../infrastructure/database/prisma")

const MAX_EVENT_DEPTH = 10
const MAX_ATTEMPTS = 10

const enqueueEvent = async ({
  event,
  entityType = null,
  entityId = null,
  actorId = null,
  context = {},
  correlationId = randomUUID(),
  causationId = null,
  depth = 0,
  idempotencyKey = null,
  availableAt = new Date(),
}) => {
  if (!event) throw new Error("event is required")
  if (depth > MAX_EVENT_DEPTH) throw new Error(`Maximum event depth of ${MAX_EVENT_DEPTH} exceeded.`)

  const id = randomUUID()
  const payload = {
    event,
    entityType,
    entityId: entityId == null ? null : String(entityId),
    actorId,
    context,
    correlationId,
    causationId,
    depth,
    occurredAt: new Date().toISOString(),
  }

  const rows = await prisma.$queryRaw`
    INSERT INTO "EventOutbox" (
      "id", "event", "entityType", "entityId", "actorId", "payload",
      "correlationId", "causationId", "depth", "availableAt", "idempotencyKey", "updatedAt"
    )
    VALUES (
      ${id}, ${event}, ${entityType}, ${entityId == null ? null : String(entityId)}, ${actorId}, ${JSON.stringify(payload)}::jsonb,
      ${correlationId}, ${causationId}, ${depth}, ${availableAt}, ${idempotencyKey}, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("idempotencyKey") DO UPDATE SET "id" = "EventOutbox"."id"
    RETURNING "id", "status", "attempts", "payload"
  `

  return rows[0]
}

const claimBatch = async ({ batchSize = 50, now = new Date() } = {}) => {
  const rows = await prisma.$queryRaw`
    WITH candidates AS (
      SELECT "id"
      FROM "EventOutbox"
      WHERE "status" IN ('PENDING', 'RETRY')
        AND "availableAt" <= ${now}
        AND "attempts" < ${MAX_ATTEMPTS}
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    )
    UPDATE "EventOutbox" AS e
    SET "status" = 'PROCESSING', "lockedAt" = CURRENT_TIMESTAMP, "attempts" = e."attempts" + 1, "updatedAt" = CURRENT_TIMESTAMP
    FROM candidates
    WHERE e."id" = candidates."id"
    RETURNING e."id", e."event", e."entityType", e."entityId", e."actorId", e."payload", e."correlationId", e."causationId", e."depth", e."attempts"
  `
  return rows
}

const markProcessed = async (id) => {
  await prisma.$executeRaw`
    UPDATE "EventOutbox"
    SET "status" = 'PROCESSED', "processedAt" = CURRENT_TIMESTAMP, "lockedAt" = NULL, "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id} AND "status" = 'PROCESSING'
  `
}

const markFailed = async (id, error) => {
  const safeError = String(error?.message || error).slice(0, 4000)
  await prisma.$executeRaw`
    UPDATE "EventOutbox"
    SET
      "status" = CASE WHEN "attempts" >= ${MAX_ATTEMPTS} THEN 'DEAD' ELSE 'RETRY' END,
      "availableAt" = CURRENT_TIMESTAMP + (LEAST("attempts", 8) * INTERVAL '10 seconds'),
      "lockedAt" = NULL,
      "lastError" = ${safeError},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id} AND "status" = 'PROCESSING'
  `
}

const recoverStale = async ({ timeoutSeconds = 300 } = {}) => {
  return prisma.$executeRaw`
    UPDATE "EventOutbox"
    SET "status" = 'RETRY', "lockedAt" = NULL, "availableAt" = CURRENT_TIMESTAMP, "lastError" = COALESCE("lastError", 'Recovered stale event lock'), "updatedAt" = CURRENT_TIMESTAMP
    WHERE "status" = 'PROCESSING'
      AND "lockedAt" < CURRENT_TIMESTAMP - (${timeoutSeconds} * INTERVAL '1 second')
  `
}

module.exports = {
  MAX_EVENT_DEPTH,
  MAX_ATTEMPTS,
  enqueueEvent,
  claimBatch,
  markProcessed,
  markFailed,
  recoverStale,
}
