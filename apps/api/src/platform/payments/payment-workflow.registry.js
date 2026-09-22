const handlers = new Map()

const registerPaymentWorkflow = (appId, handler) => {
  if (!appId || typeof appId !== 'string') throw new TypeError('appId is required.')
  if (!handler || typeof handler.beforeRecord !== 'function' || typeof handler.onSettled !== 'function')
    throw new TypeError('Payment workflow handler must provide beforeRecord and onSettled.')
  handlers.set(appId, handler)
}

const getPaymentWorkflow = (appId) => handlers.get(appId) || null

export { registerPaymentWorkflow, getPaymentWorkflow }
