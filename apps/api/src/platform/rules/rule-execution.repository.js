import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const claim = async ({ id, executionKey, ruleId, actionIndex, event, entityType, entityId, correlationId, causationId, maxAttempts }, db = prisma) => {
  const result = await db.$queryRaw`
    INSERT INTO "BusinessRuleActionExecution"
      ("id", "executionKey", "ruleId", "actionIndex", "event", "entityType", "entityId", "correlationId", "causationId", "status", "attempts", "startedAt", "createdAt", "updatedAt")
    VALUES (${id}, ${executionKey}, ${ruleId}, ${actionIndex}, ${event}, ${entityType}, ${entityId == null ? null : String(entityId)}, ${correlationId}, ${causationId}, 'RUNNING', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("executionKey") DO UPDATE SET "status" = 'RUNNING', "attempts" = "BusinessRuleActionExecution"."attempts" + 1, "startedAt" = CURRENT_TIMESTAMP, "nextAttemptAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "BusinessRuleActionExecution"."status" = 'PENDING' AND ("BusinessRuleActionExecution"."nextAttemptAt" IS NULL OR "BusinessRuleActionExecution"."nextAttemptAt" <= CURRENT_TIMESTAMP) AND "BusinessRuleActionExecution"."attempts" < ${maxAttempts}
    RETURNING *
  `
  return result[0] || null
}

const findByExecutionKey = (executionKey, db = prisma) => db.$queryRaw`SELECT * FROM "BusinessRuleActionExecution" WHERE "executionKey" = ${executionKey}`
const markSucceededRecord = (executionId, db = prisma) => db.$queryRaw`
  UPDATE "BusinessRuleActionExecution" SET "status" = 'SUCCEEDED', "completedAt" = CURRENT_TIMESTAMP, "nextAttemptAt" = NULL, "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = ${executionId} AND "status" = 'RUNNING' RETURNING *
`
const markFailedRecord = (executionId, error, maxAttempts, db = prisma) => db.$queryRaw`
  UPDATE "BusinessRuleActionExecution" SET "status" = CASE WHEN "attempts" < ${maxAttempts} THEN 'PENDING' ELSE 'DEAD_LETTER' END,
    "nextAttemptAt" = CASE WHEN "attempts" >= ${maxAttempts} THEN NULL WHEN "attempts" = 1 THEN CURRENT_TIMESTAMP + INTERVAL '1 second' WHEN "attempts" = 2 THEN CURRENT_TIMESTAMP + INTERVAL '5 seconds' WHEN "attempts" = 3 THEN CURRENT_TIMESTAMP + INTERVAL '30 seconds' ELSE CURRENT_TIMESTAMP + INTERVAL '120 seconds' END,
    "lastError" = ${String(error).slice(0, 4000)}, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = ${executionId} AND "status" = 'RUNNING' RETURNING *
`
const findDue = (limit, db = prisma) => db.$queryRaw`
  SELECT * FROM "BusinessRuleActionExecution" WHERE "status" = 'PENDING' AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= CURRENT_TIMESTAMP) ORDER BY "createdAt" ASC LIMIT ${limit}
`

export { claim, findByExecutionKey, markSucceededRecord, markFailedRecord, findDue }
