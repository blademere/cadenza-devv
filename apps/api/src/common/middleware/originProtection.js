const { env } = require('../../config')
const { ForbiddenError } = require('../errors/appError')

const allowedOrigins = new Set(
  env.CORS_ORIGIN
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
)

const originProtection = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  const origin = req.get('origin')
  if (!origin) return next()

  if (allowedOrigins.has('*') || !allowedOrigins.has(origin)) {
    return next(new ForbiddenError('Request origin is not allowed.'))
  }

  return next()
}

module.exports = originProtection
