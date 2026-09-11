import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const insertEvent = async ({
  db = prisma,
  id,
  event,
  entityType,
  entityId,
  actorId,
  payload,
  correlationId,
  causationId,
  depth,
  availableAt,
  idempotencyKey,
}) => db.$queryRaw`
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

const claimBatch = async ({ batchSize, now, maxAttempts, event, leaseSeconds }) => prisma.$queryRaw`
  WITH candidates AS (
    SELECT "id"
    FROM "EventOutbox"
    WHERE "status" IN ('PENDING', 'RETRY')
      AND "availableAt" <= ${now}
      AND "attempts" < ${maxAttempts}
      AND (${event}::text IS NULL OR "event" = ${event})
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

const markProcessed = async (id, lockToken) => prisma.$executeRaw`
  UPDATE "EventOutbox"
  SET "status" = 'PROCESSED', "processedAt" = CURRENT_TIMESTAMP, "deadAt" = NULL, "lockedAt" = NULL, "leaseUntil" = NULL, "lockToken" = NULL, "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = ${id} AND "status" = 'PROCESSING' AND "lockToken" = ${lockToken}
`

const markFailed = async ({ id, safeError, maxAttempts, retryMaxSeconds, retryBaseSeconds, lockToken }) => prisma.$executeRaw`
  UPDATE "EventOutbox"
  SET
    "status" = CASE WHEN "attempts" >= ${maxAttempts} THEN 'DEAD' ELSE 'RETRY' END,
    "availableAt" = CASE
      WHEN "attempts" >= ${maxAttempts} THEN "availableAt"
      ELSE CURRENT_TIMESTAMP + (
        LEAST(${retryMaxSeconds}, ${retryBaseSeconds} * POWER(2, GREATEST("attempts" - 1, 0))) * INTERVAL '1 second'
      )
    END,
    "deadAt" = CASE WHEN "attempts" >= ${maxAttempts} THEN CURRENT_TIMESTAMP ELSE NULL END,
    "lockedAt" = NULL,
    "leaseUntil" = NULL,
    "lockToken" = NULL,
    "lastError" = ${safeError},
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = ${id} AND "status" = 'PROCESSING' AND "lockToken" = ${lockToken}
`

const recoverStale = async ({ timeoutSeconds, event, maxAttempts }) => prisma.$executeRaw`
  UPDATE "EventOutbox"
  SET "status" = 'RETRY', "lockedAt" = NULL, "leaseUntil" = NULL, "lockToken" = NULL, "availableAt" = CURRENT_TIMESTAMP, "lastError" = COALESCE("lastError", 'Recovered stale event lease'), "updatedAt" = CURRENT_TIMESTAMP
  WHERE "status" = 'PROCESSING'
    AND "attempts" < ${maxAttempts}
    AND (${event}::text IS NULL OR "event" = ${event})
    AND ("leaseUntil" IS NOT NULL AND "leaseUntil" < CURRENT_TIMESTAMP OR "leaseUntil" IS NULL AND "lockedAt" < CURRENT_TIMESTAMP - (${timeoutSeconds} * INTERVAL '1 second'))
`

export { insertEvent, claimBatch, markProcessed, markFailed, recoverStale }
