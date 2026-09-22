import { randomUUID } from 'node:crypto'
import {
  CORRELATION_ID_HEADER,
  MAX_CONTEXT_ID_LENGTH,
  REQUEST_ID_HEADER,
} from './context.constants.js'
import { runWithContext } from './context.service.js'

const readSafeId = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_CONTEXT_ID_LENGTH) return null
  return trimmed
}

const getRequestId = (req) => readSafeId(req.requestId) || readSafeId(req.get(REQUEST_ID_HEADER)) || randomUUID()

const getCorrelationId = (req, requestId = getRequestId(req)) =>
  readSafeId(req.get(CORRELATION_ID_HEADER)) || requestId

const getActorContext = (req) => {
  const actor = req.user
  if (!actor) {
    return {
      actorId: null,
      actorType: null,
      organizationId: null,
    }
  }

  return {
    actorId: actor.id ?? null,
    actorType: actor.type ?? actor.actorType ?? null,
    organizationId: actor.organizationId ?? actor.organization?.id ?? null,
  }
}

const contextMiddleware = (req, res, next) => {
  const requestId = getRequestId(req)
  const correlationId = getCorrelationId(req, requestId)
  const { actorId, actorType, organizationId } = getActorContext(req)

  req.requestId = requestId
  req.correlationId = correlationId
  res.set(REQUEST_ID_HEADER, requestId)
  res.set(CORRELATION_ID_HEADER, correlationId)

  return runWithContext(
    {
      requestId,
      correlationId,
      actorId,
      actorType,
      organizationId,
      metadata: {},
    },
    next
  )
}

export {
  contextMiddleware,
  getActorContext,
  getCorrelationId,
  getRequestId,
  readSafeId,
}

export default contextMiddleware
