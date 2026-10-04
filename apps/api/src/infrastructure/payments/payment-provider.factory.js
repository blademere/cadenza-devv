const providers = new Map()

const registerPaymentProvider = (provider) => {
  if (!provider?.name) throw new TypeError('A payment provider with a name is required.')
  providers.set(provider.name, provider)
  return provider
}

const getPaymentProvider = (name) => {
  if (!name) throw new TypeError('Payment provider name is required.')
  const provider = providers.get(name)
  if (!provider) throw new Error(`Payment provider "${name}" is not registered.`)
  return provider
}

const listPaymentProviders = () => [...providers.keys()]

export { registerPaymentProvider, getPaymentProvider, listPaymentProviders }
