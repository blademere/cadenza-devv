import { logger } from '../../config/logger.js'
import { getContext } from '../context/context.service.js'
import { increment, observe } from './metrics/metrics.service.js'

const buildContextFields = () => {
  const context = getContext() || {}
  return {
    requestId: context.requestId || null,
    correlationId: context.correlationId || null,
    actorId: context.actorId || null,
  }
}

const instrument = async (operation, handler, { metric = null, labels = {}, log = true } = {}) => {
  const startedAt = Date.now()
  const base = { operation, ...buildContextFields() }

  try {
    const result = await handler()
    const duration = Date.now() - startedAt
    if (metric) {
      increment(`${metric}.total`, labels)
      observe(`${metric}.duration_ms`, duration, labels)
    }
    if (log) logger.info({ ...base, duration }, 'Platform operation completed')
    return result
  } catch (error) {
    const duration = Date.now() - startedAt
    if (metric) {
      increment(`${metric}.total`, labels)
      increment(`${metric}.failed`, labels)
      observe(`${metric}.duration_ms`, duration, labels)
    }
    if (log) logger.error({ ...base, duration, err: error }, 'Platform operation failed')
    throw error
  }
}

const createTimer = ({ operation, metric = null, labels = {}, log = true } = {}) => {
  const startedAt = Date.now()
  const base = { operation, ...buildContextFields() }
  let ended = false

  return {
    end({ success = true, error = null, fields = {} } = {}) {
      if (ended) return null
      ended = true
      const duration = Date.now() - startedAt
      if (metric) {
        increment(`${metric}.total`, labels)
        if (!success) increment(`${metric}.failed`, labels)
        observe(`${metric}.duration_ms`, duration, labels)
      }
      if (log) {
        const payload = { ...base, ...fields, duration }
        if (success) logger.info(payload, 'Platform operation completed')
        else logger.error({ ...payload, err: error }, 'Platform operation failed')
      }
      return duration
    },
  }
}

export { buildContextFields, instrument, createTimer }
