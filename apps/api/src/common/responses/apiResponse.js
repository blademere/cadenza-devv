const normalizeBigInt = (value) => {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(normalizeBigInt)
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeBigInt(entry)]),
    )
  }
  return value
}

const successResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: normalizeBigInt(data),
  })
}

const errorResponse = (res, message, errors = [], statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: normalizeBigInt(errors),
  })
}

export { normalizeBigInt, successResponse, errorResponse }
