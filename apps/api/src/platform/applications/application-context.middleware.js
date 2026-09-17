import { ForbiddenError } from '../../common/errors/appError.js'
import { setApplicationContext } from '../context/index.js'
import { getUserAuthorizationContext } from '../authorization/authorization-context.repository.js'
import { APPLICATION_ID_HEADER } from '../context/context.constants.js'
import { normalizeAppId } from './application-scope.js'

const readApplicationId = (req) => {
  const value = req.get?.(APPLICATION_ID_HEADER) ?? req.headers?.[APPLICATION_ID_HEADER]
  return typeof value === 'string' ? normalizeAppId(value) : null
}

const requireApplicationContext = ({ appKey = null } = {}) => {
  if (appKey !== null && (typeof appKey !== 'string' || !appKey.trim())) {
    throw new TypeError('Application key must be a non-empty string when provided.')
  }

  const normalizedAppKey = appKey?.trim() || null

  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('User context not found.'))
      }

      const tokenAppId = req.auth?.appId ?? null
      const headerAppId = readApplicationId(req)

      if (tokenAppId && headerAppId && tokenAppId !== headerAppId) {
        return next(new ForbiddenError('Application context does not match the access token.'))
      }

      const appId = tokenAppId || headerAppId
      if (!appId) {
        return next(new ForbiddenError('Application context is required.'))
      }

      const security = await getUserAuthorizationContext({
        userId: req.user.id,
        appId,
      })

      if (!security) {
        return next(new ForbiddenError('User does not have an active membership for this application.'))
      }

      if (normalizedAppKey && security.app.key !== normalizedAppKey) {
        return next(new ForbiddenError(`Application context '${normalizedAppKey}' is required.`))
      }

      const { app, membership, roles, permissions } = security
      const securityContext = {
        user: req.user,
        app,
        membership,
        roles,
        permissions,
      }

      req.appContext = { ...app }
      req.appMembership = membership
      req.security = securityContext

      setApplicationContext({
        appId: app.id,
        appKey: app.key,
      })

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export { requireApplicationContext, readApplicationId }
