import { ForbiddenError } from '../../common/errors/appError.js'
import { getContext } from '../context/context.service.js'
import { recordAuthorizationDenied } from '../audit/audit.service.js'
import * as accessControlService from './access-control.service.js'

const authorize = (resourceOrPermission, action) => {
  let resource = resourceOrPermission
  let resolvedAction = action

  if (action === undefined && typeof resourceOrPermission === 'string') {
    const separatorIndex = resourceOrPermission.indexOf(':')
    if (
      separatorIndex > 0 &&
      separatorIndex < resourceOrPermission.length - 1
    ) {
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
      'authorize requires a resource/action pair or a permission key such as "plan_permits:create".'
    )
  }

  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('User context not found.'))
      }

      const appId = req.auth?.appId ?? req.appContext?.id ?? null
      if (!appId) {
        return next(new ForbiddenError('Application context is required for authorization.'))
      }

      const allowed = await accessControlService.can({
        userId: req.user.id,
        appId,
        resource: resource.trim(),
        action: resolvedAction.trim(),
      })

      if (!allowed) {
        const context = getContext()
        await recordAuthorizationDenied({
          actorId: req.user.id,
          appId,
          resource: resource.trim(),
          action: resolvedAction.trim(),
          resourceId: req.params?.id,
          ipAddress: req.ip,
          userAgent: req.get?.('user-agent'),
          requestId: context?.requestId || req.requestId || null,
          correlationId: context?.correlationId || req.correlationId || null,
        })

        return next(
          new ForbiddenError(
            'You do not have permission to perform this action.'
          )
        )
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export default authorize
