import { ForbiddenError, NotFoundError } from '../../common/errors/appError.js'
import { getContext } from '../context/context.service.js'
import { recordAuthorizationDenied } from '../audit/audit.service.js'
import * as accessControlService from './access-control.service.js'
import * as accessControlPolicy from './access-control.policy.js'

const authorizeResource = ({ resource, action, loadResource, policy, getResourceId = (req) => req.params?.id, getOwnerId }) => {
  if (typeof loadResource !== 'function') throw new TypeError('authorizeResource requires a loadResource function.')
  if (policy !== undefined && typeof policy !== 'function') throw new TypeError('authorizeResource policy must be a function.')

  return async (req, _res, next) => {
    try {
      if (!req.user) return next(new ForbiddenError('User context not found.'))
      const appId = req.auth?.appId ?? req.appContext?.id ?? null
      if (!appId) return next(new ForbiddenError('Application context is required for authorization.'))

      const resourceId = getResourceId(req)
      const allowed = await accessControlService.can({ userId: req.user.id, appId, resource, action })
      if (!allowed) {
        const context = getContext()
        await recordAuthorizationDenied({ actorId: req.user.id, appId, resource, action, resourceId, ipAddress: req.ip, userAgent: req.get?.('user-agent'), requestId: context?.requestId || req.requestId || null, correlationId: context?.correlationId || req.correlationId || null })
        return next(new ForbiddenError('You do not have permission to perform this action.'))
      }

      const resourceInstance = await loadResource(resourceId, req)
      if (!resourceInstance) return next(new NotFoundError('Resource not found.'))

      if (policy) {
        const authorizationContext = await accessControlService.getAuthorizationContext(req.user.id, appId)
        const user = { ...req.user, roles: authorizationContext.roles, appId }
        if (typeof getOwnerId === 'function') user.ownerId = getOwnerId(resourceInstance, req)
        try {
          await accessControlPolicy.assertPolicy({ policy, user, resource: resourceInstance })
        } catch (error) {
          if (error instanceof ForbiddenError) {
            const context = getContext()
            await recordAuthorizationDenied({ actorId: req.user.id, appId, resource, action, resourceId, ipAddress: req.ip, userAgent: req.get?.('user-agent'), requestId: context?.requestId || req.requestId || null, correlationId: context?.correlationId || req.correlationId || null, reason: 'resource_policy_denied' })
          }
          throw error
        }
      }

      req.authorizedResource = resourceInstance
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export default authorizeResource
