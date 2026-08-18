const { randomUUID } = require("node:crypto")
const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()
const MAX_EVENT_DEPTH = 10
const MAX_ATTEMPTS = 10
const DEFAULT_LEASE_SECONDS = 300

const enqueueEvent = async ({
  db = prisma,
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
  if (idempotencyKey !== null && (typeof idempotencyKey !== "string" || idempotencyKey.length === 0 || idempotencyKey.length > 512)) throw new Error("idempotencyKey must be a non-empty string of at most 512 characters.")

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

  const rows = await db.$queryRaw`
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

const claimBatch = async ({ batchSize = 50, now = new Date(), leaseSeconds = DEFAULT_LEASE_SECONDS } = {}) => {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new Error("batchSize must be an integer between 1 and 1000.")
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 86400) throw new Error("leaseSeconds must be an integer between 1 and 86400.")

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
    SET
      "status" = 'PROCESSING',
      "lockedAt" = CURRENT_TIMESTAMP,
      "leaseUntil" = CURRENT_TIMESTAMP + (${leaseSeconds} * INTERVAL '1 second'),
      "lockToken" = md5(random()::text || clock_timestamp()::text || e."id"),
      "attempts" = e."attempts" + 1,
      "updatedAt" = CURRENT_TIMESTAMP
    FROM candidates
    WHERE e."id" = candidates."id"
    RETURNING e."id", e."event", e."entityType", e."entityId", e."actorId", e."payload", e."correlationId", e."causationId", e."depth", e."attempts", e."lockToken", e."leaseUntil"
  `
  return rows
}

const markProcessed = async (id, lockToken) => {
  if (!lockToken) throw new Error("lockToken is required to complete an outbox event.")
  const result = await prisma.$executeRaw`
    UPDATE "EventOutbox"
    SET "status" = 'PROCESSED', "processedAt" = CURRENT_TIMESTAMP, "lockedAt" = NULL, "leaseUntil" = NULL, "lockToken" = NULL, "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id} AND "status" = 'PROCESSING' AND "lockToken" = ${lockToken}
  `
  if (result !== 1) throw new Error("Outbox event was no longer owned by this worker.")
}

const markFailed = async (id, error, lockToken) => {
  if (!lockToken) throw new Error("lockToken is required to fail an outbox event.")
  const safeError = String(error?.message || error).slice(0, 4000)
  const result = await prisma.$executeRaw`
    UPDATE "EventOutbox"
    SET
      "status" = CASE WHEN "attempts" >= ${MAX_ATTEMPTS} THEN 'DEAD' ELSE 'RETRY' END,
      "availableAt" = CURRENT_TIMESTAMP + (LEAST("attempts", 8) * INTERVAL '10 seconds'),
      "lockedAt" = NULL,
      "leaseUntil" = NULL,
      "lockToken" = NULL,
      "lastError" = ${safeError},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id} AND "status" = 'PROCESSING' AND "lockToken" = ${lockToken}
  `
  if (result !== 1) throw new Error("Outbox event was no longer owned by this worker.")
}

const recoverStale = async ({ timeoutSeconds = DEFAULT_LEASE_SECONDS } = {}) => {
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 86400) throw new Error("timeoutSeconds must be an integer between 1 and 86400.")
  return prisma.$executeRaw`
    UPDATE "EventOutbox"
    SET "status" = 'RETRY', "lockedAt" = NULL, "leaseUntil" = NULL, "lockToken" = NULL, "availableAt" = CURRENT_TIMESTAMP, "lastError" = COALESCE("lastError", 'Recovered stale event lease'), "updatedAt" = CURRENT_TIMESTAMP
    WHERE "status" = 'PROCESSING'
      AND ("leaseUntil" IS NOT NULL AND "leaseUntil" < CURRENT_TIMESTAMP OR "leaseUntil" IS NULL AND "lockedAt" < CURRENT_TIMESTAMP - (${timeoutSeconds} * INTERVAL '1 second'))
  `
}

module.exports = {
  MAX_EVENT_DEPTH,
  MAX_ATTEMPTS,
  DEFAULT_LEASE_SECONDS,
  enqueueEvent,
  claimBatch,
  markProcessed,
  markFailed,
  recoverStale,
}
