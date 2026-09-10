const serializeJsonValue = (value) => {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map(serializeJsonValue)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeJsonValue(entry)]),
    )
  }

  return value
}

const successResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: serializeJsonValue(data),
  })
}

const errorResponse = (res, message, errors = [], statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: serializeJsonValue(errors),
  })
}

export { serializeJsonValue, successResponse, errorResponse }
