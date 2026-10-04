import { env } from '../../config/index.js'
import { isAllowedCorsOrigin, parseCorsOrigins } from '../../config/cors.js'
import { ForbiddenError } from '../errors/appError.js'

const allowedOrigins = parseCorsOrigins(env.CORS_ORIGIN)

const originProtection = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  const origin = req.get('origin')
  if (!origin) return next()

  if (!isAllowedCorsOrigin(allowedOrigins, origin)) {
    return next(new ForbiddenError('Request origin is not allowed.'))
  }

  return next()
}

export default originProtection
export { originProtection }
