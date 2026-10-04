import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

const normalizeContext = (context = {}) => ({
  requestId: context.requestId ?? null,
  correlationId: context.correlationId ?? null,
  actorId: context.actorId ?? null,
  actorType: context.actorType ?? null,
  organizationId: context.organizationId ?? null,
  appId: context.appId ?? null,
  appKey: context.appKey ?? null,
  metadata: context.metadata && typeof context.metadata === 'object' ? { ...context.metadata } : {},
})

const runWithContext = (context, callback) => storage.run(normalizeContext(context), callback)

const getContext = () => storage.getStore() || null

const requireContext = () => {
  const context = getContext()
  if (!context) {
    throw new Error('Platform execution context is not available.')
  }
  return context
}

const setActorContext = ({ actorId = null, actorType = null, organizationId = null } = {}) => {
  const context = storage.getStore()
  if (!context) return null

  context.actorId = actorId
  context.actorType = actorType
  context.organizationId = organizationId

  return context
}

const setApplicationContext = ({ appId = null, appKey = null } = {}) => {
  const context = storage.getStore()
  if (!context) return null

  context.appId = appId
  context.appKey = appKey

  return context
}

const withContext = (overrides, callback) => {
  const current = getContext() || {}
  return runWithContext(
    {
      ...current,
      ...overrides,
      metadata: {
        ...(current.metadata || {}),
        ...(overrides?.metadata || {}),
      },
    },
    callback
  )
}

export {
  getContext,
  requireContext,
  runWithContext,
  setActorContext,
  setApplicationContext,
  withContext,
}
