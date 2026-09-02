import * as Sentry from '@sentry/node'
import { env } from '../../config/index.js'

let initialized = false

const initializeSentry = () => {
  if (initialized) {
    return
  }

  if (!env.SENTRY_DSN) {
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    enabled: Boolean(env.SENTRY_DSN),
  })

  initialized = true
}

const captureException = (error, context = {}) => {
  if (!initialized) {
    return
  }

  Sentry.withScope((scope) => {
    if (context.userId) {
      scope.setUser({
        id: String(context.userId),
      })
    }

    if (context.request) {
      scope.setContext('request', context.request)
    }

    Sentry.captureException(error)
  })
}

const flushSentry = async (timeout = 2000) => {
  if (!initialized) {
    return true
  }

  return Sentry.flush(timeout)
}

export { initializeSentry, captureException, flushSentry }
