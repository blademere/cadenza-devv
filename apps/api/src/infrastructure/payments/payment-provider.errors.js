class PaymentProviderError extends Error {
  constructor(message, { provider = null, code = 'PROVIDER_ERROR', retryable = false } = {}) {
    super(message)
    this.name = 'PaymentProviderError'
    this.provider = provider
    this.code = code
    this.retryable = retryable
  }
}

class PaymentProviderConfigurationError extends PaymentProviderError {
  constructor(message, provider = null) {
    super(message, { provider, code: 'PROVIDER_CONFIGURATION_ERROR' })
  }
}

class PaymentProviderRequestError extends PaymentProviderError {
  constructor(message, { provider = null, code = 'PROVIDER_REQUEST_ERROR', retryable = true } = {}) {
    super(message, { provider, code, retryable })
  }
}

export { PaymentProviderError, PaymentProviderConfigurationError, PaymentProviderRequestError }
