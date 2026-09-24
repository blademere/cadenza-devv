const providers = new Map()

const registerPaymentProvider = (name, provider) => {
  if (!name || typeof name !== 'string') throw new TypeError('Payment provider name is required.')
  if (!provider) throw new TypeError('Payment provider is required.')
  providers.set(name.toUpperCase(), provider)
}

const getPaymentProvider = (name) => {
  const provider = providers.get(String(name || '').toUpperCase())
  if (!provider) throw new Error(`Payment provider is not configured: ${name}`)
  return provider
}

export { registerPaymentProvider, getPaymentProvider }
