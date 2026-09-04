import crypto from 'node:crypto'
import { getPrismaClient } from '../../infrastructure/database/prisma.js'
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/appError.js'

const prisma = getPrismaClient()
const MAX_ATTEMPTS = 5
const RETRY_DELAYS_MS = [1000, 5000, 30000, 120000]

const makeExecutionKey = ({ ruleId, actionIndex, event, entityType = null, entityId = null, correlationId }) => {
  if (!ruleId || !Number.isInteger(actionIndex) || actionIndex < 0 || !event || !correlationId) throw new BadRequestError('ruleId, actionIndex, event, and correlationId are required.')
  return crypto.createHash('sha256').update(JSON.stringify({ ruleId, actionIndex, event, entityType, entityId: entityId == null ? null : String(entityId), correlationId })).digest('hex')
}

const claimAction = async ({ ruleId, actionIndex, event, entityType = null, entityId = null, correlationId, causationId = null }) => {
  const executionKey = makeExecutionKey({ ruleId, actionIndex, event, entityType, entityId, correlationId })
  const id = crypto.randomUUID()
  const result = await prisma.$queryRaw`
    INSERT INTO "BusinessRuleActionExecution"
      ("id", "executionKey", "ruleId", "actionIndex", "event", "entityType", "entityId", "correlationId", "causationId", "status", "attempts", "startedAt", "createdAt", "updatedAt")
    VALUES (${id}, ${executionKey}, ${ruleId}, ${actionIndex}, ${event}, ${entityType}, ${entityId == null ? null : String(entityId)}, ${correlationId}, ${causationId}, 'RUNNING', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("executionKey") DO UPDATE SET "status" = 'RUNNING', "attempts" = "BusinessRuleActionExecution"."attempts" + 1, "startedAt" = CURRENT_TIMESTAMP, "nextAttemptAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "BusinessRuleActionExecution"."status" = 'PENDING' AND ("BusinessRuleActionExecution"."nextAttemptAt" IS NULL OR "BusinessRuleActionExecution"."nextAttemptAt" <= CURRENT_TIMESTAMP) AND "BusinessRuleActionExecution"."attempts" < ${MAX_ATTEMPTS}
    RETURNING *
  `
  if (result[0]) return { claimed: true, execution: result[0] }
  const existing = await prisma.$queryRaw`SELECT * FROM "BusinessRuleActionExecution" WHERE "executionKey" = ${executionKey}`
  if (!existing[0]) throw new ConflictError('Business rule action execution could not be claimed.')
  return { claimed: false, execution: existing[0] }
}

const markSucceeded = async (executionId) => {
  const result = await prisma.$queryRaw`
    UPDATE "BusinessRuleActionExecution" SET "status" = 'SUCCEEDED', "completedAt" = CURRENT_TIMESTAMP, "nextAttemptAt" = NULL, "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${executionId} AND "status" = 'RUNNING' RETURNING *
  `
  if (!result[0]) throw new NotFoundError(`Rule action execution '${executionId}' is not running.`)
  return result[0]
}

const markFailed = async (executionId, error) => {
  const result = await prisma.$queryRaw`
    UPDATE "BusinessRuleActionExecution" SET "status" = CASE WHEN "attempts" < ${MAX_ATTEMPTS} THEN 'PENDING' ELSE 'DEAD_LETTER' END,
      "nextAttemptAt" = CASE WHEN "attempts" >= ${MAX_ATTEMPTS} THEN NULL WHEN "attempts" = 1 THEN CURRENT_TIMESTAMP + INTERVAL '1 second' WHEN "attempts" = 2 THEN CURRENT_TIMESTAMP + INTERVAL '5 seconds' WHEN "attempts" = 3 THEN CURRENT_TIMESTAMP + INTERVAL '30 seconds' ELSE CURRENT_TIMESTAMP + INTERVAL '120 seconds' END,
      "lastError" = ${String(error).slice(0, 4000)}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${executionId} AND "status" = 'RUNNING' RETURNING *
  `
  if (!result[0]) throw new NotFoundError(`Rule action execution '${executionId}' is not running.`)
  return result[0]
}

const getDueActions = async (limit = 50) => prisma.$queryRaw`
  SELECT * FROM "BusinessRuleActionExecution" WHERE "status" = 'PENDING' AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= CURRENT_TIMESTAMP) ORDER BY "createdAt" ASC LIMIT ${Math.min(Math.max(Number(limit) || 50, 1), 100)}
`

export { MAX_ATTEMPTS, RETRY_DELAYS_MS, makeExecutionKey, claimAction, markSucceeded, markFailed, getDueActions }
