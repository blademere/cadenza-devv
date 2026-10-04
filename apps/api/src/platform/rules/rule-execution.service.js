import crypto from 'node:crypto'
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/appError.js'
import { claim, findByExecutionKey, markSucceededRecord, markFailedRecord, findDue } from './rule-execution.repository.js'

const MAX_ATTEMPTS = 5
const RETRY_DELAYS_MS = [1000, 5000, 30000, 120000]

const makeExecutionKey = ({ ruleId, actionIndex, event, entityType = null, entityId = null, correlationId }) => {
  if (!ruleId || !Number.isInteger(actionIndex) || actionIndex < 0 || !event || !correlationId) throw new BadRequestError('ruleId, actionIndex, event, and correlationId are required.')
  return crypto.createHash('sha256').update(JSON.stringify({ ruleId, actionIndex, event, entityType, entityId: entityId == null ? null : String(entityId), correlationId })).digest('hex')
}

const claimAction = async ({ ruleId, actionIndex, event, entityType = null, entityId = null, correlationId, causationId = null }) => {
  const executionKey = makeExecutionKey({ ruleId, actionIndex, event, entityType, entityId, correlationId })
  const result = await claim({ id: crypto.randomUUID(), executionKey, ruleId, actionIndex, event, entityType, entityId, correlationId, causationId, maxAttempts: MAX_ATTEMPTS })
  if (result) return { claimed: true, execution: result }
  const existing = await findByExecutionKey(executionKey)
  if (!existing[0]) throw new ConflictError('Business rule action execution could not be claimed.')
  return { claimed: false, execution: existing[0] }
}

const markSucceeded = async (executionId) => {
  const result = await markSucceededRecord(executionId)
  if (!result[0]) throw new NotFoundError(`Rule action execution '${executionId}' is not running.`)
  return result[0]
}

const markFailed = async (executionId, error) => {
  const result = await markFailedRecord(executionId, error, MAX_ATTEMPTS)
  if (!result[0]) throw new NotFoundError(`Rule action execution '${executionId}' is not running.`)
  return result[0]
}

const getDueActions = async (limit = 50) => findDue(Math.min(Math.max(Number(limit) || 50, 1), 100))

export { MAX_ATTEMPTS, RETRY_DELAYS_MS, makeExecutionKey, claimAction, markSucceeded, markFailed, getDueActions }
