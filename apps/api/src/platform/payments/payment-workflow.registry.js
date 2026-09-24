const handlers = new Map()

const registerPaymentWorkflow = (applicationKey, handler) => {
  if (!applicationKey || typeof applicationKey !== 'string') throw new TypeError('applicationKey is required.')
  if (!handler || typeof handler.beforeRecord !== 'function' || typeof handler.onSettled !== 'function')
    throw new TypeError('Payment workflow handler must provide beforeRecord and onSettled.')
  handlers.set(applicationKey, handler)
}

const getPaymentWorkflow = (applicationKey) => handlers.get(applicationKey) || null

export { registerPaymentWorkflow, getPaymentWorkflow }
