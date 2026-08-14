const { ForbiddenError, NotFoundError } = require("../errors/appError")
const accessControlService = require("../../features/access-control/access-control.service")
const { assertPolicy } = require("../../features/access-control/access-control.policy")

const authorizeResource = ({
  resource,
  action,
  loadResource,
  policy,
  getResourceId = (req) => req.params?.id,
  getOwnerId,
}) => {
  if (typeof loadResource !== "function") {
    throw new TypeError("authorizeResource requires a loadResource function.")
  }

  if (policy !== undefined && typeof policy !== "function") {
    throw new TypeError("authorizeResource policy must be a function.")
  }

  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new ForbiddenError("User context not found."))
      }

      const allowed = await accessControlService.can({
        userId: req.user.id,
        resource,
        action,
      })

      if (!allowed) {
        return next(
          new ForbiddenError(
            "You do not have permission to perform this action.",
          ),
        )
      }

      const resourceId = getResourceId(req)
      const resourceInstance = await loadResource(resourceId, req)

      if (!resourceInstance) {
        return next(new NotFoundError("Resource not found."))
      }

      if (policy) {
        const authorizationContext = await accessControlService.getAuthorizationContext(
          req.user.id,
        )
        const user = {
          ...req.user,
          role: authorizationContext.role,
        }

        if (typeof getOwnerId === "function") {
          user.ownerId = getOwnerId(resourceInstance, req)
        }

        await assertPolicy({
          policy,
          user,
          resource: resourceInstance,
        })
      }

      req.authorizedResource = resourceInstance
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

module.exports = authorizeResource
