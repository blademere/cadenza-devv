import { ForbiddenError, NotFoundError } from '../../common/errors/appError.js'
import { getContext } from '../context/context.service.js'
import { recordAuthorizationDenied } from '../audit/audit.service.js'
import * as authorizationService from './authorization.service.js'
import * as authorizationPolicy from './authorization.policy.js'

const resolveAppId = (req) => req.auth?.appId ?? req.appContext?.id ?? null

const authorize = (resourceOrPermission, action) => {
  let resource = resourceOrPermission
  let resolvedAction = action

  if (action === undefined && typeof resourceOrPermission === 'string') {
    const separatorIndex = resourceOrPermission.indexOf(':')
    if (separatorIndex > 0 && separatorIndex < resourceOrPermission.length - 1) {
      resource = resourceOrPermission.slice(0, separatorIndex)
      resolvedAction = resourceOrPermission.slice(separatorIndex + 1)
    }
  }

  if (
    typeof resource !== 'string' ||
    !resource.trim() ||
    typeof resolvedAction !== 'string' ||
    !resolvedAction.trim()
  ) {
    throw new TypeError(
      'authorize requires a resource/action pair or a permission key such as "applications:create".'
    )
  }

  return async (req, _res, next) => {
    try {
      if (!req.user) return next(new ForbiddenError('User context not found.'))

      const appId = resolveAppId(req)
      if (!appId) return next(new ForbiddenError('Application context is required for authorization.'))

      const normalizedResource = resource.trim()
      const normalizedAction = resolvedAction.trim()
      const allowed = await authorizationService.can({
        userId: req.user.id,
        appId,
        resource: normalizedResource,
        action: normalizedAction,
      })

      if (!allowed) {
        const context = getContext()
        await recordAuthorizationDenied({
          actorId: req.user.id,
          appId,
          resource: normalizedResource,
          action: normalizedAction,
          resourceId: req.params?.id,
          ipAddress: req.ip,
          userAgent: req.get?.('user-agent'),
          requestId: context?.requestId || req.requestId || null,
          correlationId: context?.correlationId || req.correlationId || null,
        })

        return next(new ForbiddenError('You do not have permission to perform this action.'))
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

const authorizeResource = ({
  resource,
  action,
  loadResource,
  policy,
  getResourceId = (req) => req.params?.id,
  getOwnerId,
}) => {
  if (typeof loadResource !== 'function') throw new TypeError('authorizeResource requires a loadResource function.')
  if (policy !== undefined && typeof policy !== 'function') throw new TypeError('authorizeResource policy must be a function.')

  return async (req, _res, next) => {
    try {
      if (!req.user) return next(new ForbiddenError('User context not found.'))

      const appId = resolveAppId(req)
      if (!appId) return next(new ForbiddenError('Application context is required for authorization.'))

      const resourceId = getResourceId(req)
      const allowed = await authorizationService.can({
        userId: req.user.id,
        appId,
        resource,
        action,
      })

      if (!allowed) {
        const context = getContext()
        await recordAuthorizationDenied({
          actorId: req.user.id,
          appId,
          resource,
          action,
          resourceId,
          ipAddress: req.ip,
          userAgent: req.get?.('user-agent'),
          requestId: context?.requestId || req.requestId || null,
          correlationId: context?.correlationId || req.correlationId || null,
        })
        return next(new ForbiddenError('You do not have permission to perform this action.'))
      }

      const resourceInstance = await loadResource(resourceId, req)
      if (!resourceInstance) return next(new NotFoundError('Resource not found.'))

      if (
        resourceInstance.appId !== undefined &&
        resourceInstance.appId !== null &&
        resourceInstance.appId !== appId
      ) {
        return next(new NotFoundError('Resource not found.'))
      }

      if (policy) {
        const authorizationContext = await authorizationService.getAuthorizationContext(req.user.id, appId)
        const user = { ...req.user, roles: authorizationContext.roles, appId }
        if (typeof getOwnerId === 'function') user.ownerId = getOwnerId(resourceInstance, req)

        try {
          await authorizationPolicy.assertPolicy({
            policy,
            user,
            resource: resourceInstance,
          })
        } catch (error) {
          if (error instanceof ForbiddenError) {
            const context = getContext()
            await recordAuthorizationDenied({
              actorId: req.user.id,
              appId,
              resource,
              action,
              resourceId,
              ipAddress: req.ip,
              userAgent: req.get?.('user-agent'),
              requestId: context?.requestId || req.requestId || null,
              correlationId: context?.correlationId || req.correlationId || null,
              reason: 'resource_policy_denied',
            })
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

export { authorize, authorizeResource }
export default authorize
