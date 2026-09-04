import { ForbiddenError } from '../../common/errors/appError.js'
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

      const allowed = await accessControlService.can({
        userId: req.user.id,
        resource: resource.trim(),
        action: resolvedAction.trim(),
      })

      if (!allowed) {
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
