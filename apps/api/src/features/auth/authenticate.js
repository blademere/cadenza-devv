import { UnauthorizedError } from '../../common/errors/appError.js'
import { setActorContext } from '../../platform/context/index.js'
import { verifyAccessToken } from './auth.tokens.js'

const authenticate = (req, _res, next) => {
  const authorizationHeader = req.headers.authorization || ''
  const [scheme, token] = authorizationHeader.trim().split(/\s+/)

  if (scheme !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Missing or invalid access token.'))
  }

  try {
    const payload = verifyAccessToken(token)

    if (payload.type !== 'access') {
      return next(new UnauthorizedError('Access token is invalid.'))
    }

    if (!payload.sub) {
      return next(new UnauthorizedError('Access token is invalid.'))
    }

    const userId = Number(payload.sub)

    if (!Number.isInteger(userId) || userId <= 0) {
      return next(new UnauthorizedError('Access token is invalid.'))
    }

    req.user = {
      id: userId,
    }
    setActorContext({ actorId: userId, actorType: 'user' })

    return next()
  } catch (_error) {
    return next(new UnauthorizedError('Access token is invalid or expired.'))
  }
}

export default authenticate
