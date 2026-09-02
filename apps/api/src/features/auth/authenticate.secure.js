import { UnauthorizedError } from '../../common/errors/appError.js'
import { verifyAccessToken } from './auth.tokens.js'
import * as authRepository from './auth.repository.js'

const authenticate = async (req, _res, next) => {
  const authorizationHeader = req.headers.authorization || ''
  const [scheme, token] = authorizationHeader.trim().split(/\s+/)
  if (scheme !== 'Bearer' || !token)
    return next(new UnauthorizedError('Missing or invalid access token.'))
  try {
    const payload = verifyAccessToken(token)
    if (
      payload.type !== 'access' ||
      !payload.sub ||
      !Number.isInteger(payload.authVersion) ||
      payload.authVersion < 0
    )
      return next(new UnauthorizedError('Access token is invalid.'))
    const userId = Number(payload.sub)
    if (!Number.isInteger(userId) || userId <= 0)
      return next(new UnauthorizedError('Access token is invalid.'))
    const user = await authRepository.findUserAuthState(userId)
    if (!user || !user.isActive || user.authVersion !== payload.authVersion)
      return next(new UnauthorizedError('Access token has been revoked.'))
    req.user = { id: userId }
    return next()
  } catch (_error) {
    return next(new UnauthorizedError('Access token is invalid or expired.'))
  }
}
export default authenticate
