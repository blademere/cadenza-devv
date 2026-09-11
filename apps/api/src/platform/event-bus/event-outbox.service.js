import { randomUUID } from 'node:crypto'
import { insertEvent, claimBatch as claimBatchRecord, markProcessed as markProcessedRecord, markFailed as markFailedRecord, recoverStale as recoverStaleRecords } from './event-outbox.repository.js'

const MAX_EVENT_DEPTH = 10
const MAX_ATTEMPTS = 10
const DEFAULT_LEASE_SECONDS = 300
const RETRY_BASE_SECONDS = 5
const RETRY_MAX_SECONDS = 300

const enqueueEvent = async ({
  db,
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
  if (!event) throw new Error('event is required')
  if (depth > MAX_EVENT_DEPTH)
    throw new Error(`Maximum event depth of ${MAX_EVENT_DEPTH} exceeded.`)
  if (
    idempotencyKey !== null &&
    (typeof idempotencyKey !== 'string' ||
      idempotencyKey.length === 0 ||
      idempotencyKey.length > 512)
  )
    throw new Error(
      'idempotencyKey must be a non-empty string of at most 512 characters.'
    )

  const id = randomUUID()
  const occurredAt = new Date().toISOString()
  const payload = {
    eventId: id,
    event,
    entityType,
    entityId: entityId == null ? null : String(entityId),
    actorId,
    context,
    correlationId,
    causationId,
    depth,
    occurredAt,
  }

  const rows = await insertEvent({
    db,
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
  })

  return rows[0]
}

const claimBatch = async ({
  batchSize = 50,
  now = new Date(),
  leaseSeconds = DEFAULT_LEASE_SECONDS,
  event = null,
} = {}) => {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000)
    throw new Error('batchSize must be an integer between 1 and 1000.')
  if (
    !Number.isInteger(leaseSeconds) ||
    leaseSeconds < 1 ||
    leaseSeconds > 86400
  )
    throw new Error('leaseSeconds must be an integer between 1 and 86400.')
  if (event !== null && (typeof event !== 'string' || event.length === 0))
    throw new Error('event must be null or a non-empty string.')

  return claimBatchRecord({ batchSize, now, maxAttempts: MAX_ATTEMPTS, event, leaseSeconds })
}

const markProcessed = async (id, lockToken) => {
  if (!lockToken)
    throw new Error('lockToken is required to complete an outbox event.')
  const result = await markProcessedRecord(id, lockToken)
  if (result !== 1)
    throw new Error('Outbox event was no longer owned by this worker.')
}

const markFailed = async (id, error, lockToken) => {
  if (!lockToken)
    throw new Error('lockToken is required to fail an outbox event.')
  const safeError = String(error?.message || error).slice(0, 4000)
  const result = await markFailedRecord({
    id,
    safeError,
    maxAttempts: MAX_ATTEMPTS,
    retryMaxSeconds: RETRY_MAX_SECONDS,
    retryBaseSeconds: RETRY_BASE_SECONDS,
    lockToken,
  })
  if (result !== 1)
    throw new Error('Outbox event was no longer owned by this worker.')
}

const recoverStale = async ({
  timeoutSeconds = DEFAULT_LEASE_SECONDS,
  event = null,
} = {}) => {
  if (
    !Number.isInteger(timeoutSeconds) ||
    timeoutSeconds < 1 ||
    timeoutSeconds > 86400
  )
    throw new Error('timeoutSeconds must be an integer between 1 and 86400.')
  if (event !== null && (typeof event !== 'string' || event.length === 0))
    throw new Error('event must be null or a non-empty string.')
  return recoverStaleRecords({ timeoutSeconds, event, maxAttempts: MAX_ATTEMPTS })
}

export {
  MAX_EVENT_DEPTH,
  MAX_ATTEMPTS,
  DEFAULT_LEASE_SECONDS,
  RETRY_BASE_SECONDS,
  RETRY_MAX_SECONDS,
  enqueueEvent,
  claimBatch,
  markProcessed,
  markFailed,
  recoverStale,
}
