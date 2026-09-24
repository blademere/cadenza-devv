const parseCorsOrigins = (value) => new Set(
  String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
)

const isAllowedCorsOrigin = (allowedOrigins, requestOrigin) => {
  if (!requestOrigin) return true
  return allowedOrigins.has('*') || allowedOrigins.has(requestOrigin)
}

const createCorsOptions = (value) => {
  const allowedOrigins = parseCorsOrigins(value)

  return {
    origin: (requestOrigin, callback) => {
      if (isAllowedCorsOrigin(allowedOrigins, requestOrigin)) {
        return callback(null, requestOrigin || true)
      }

      return callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'Idempotency-Key',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-App-ID',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Correlation-ID'],
  }
}

export {
  parseCorsOrigins,
  isAllowedCorsOrigin,
  createCorsOptions,
}
