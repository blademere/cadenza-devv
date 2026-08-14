const { ForbiddenError } = require("../errors/appError")
const { can, getAuthorizationContext } = require("../../features/access-control/access-control.service")
const { assertPolicy } = require("../../features/access-control/access-control.policy")

const authorizeResource = ({
  resource,
  action,
  loadResource,
  policy,
  getResourceId,
}) => {
  if (typeof loadResource !== "function") {
    throw new TypeError("authorizeResource requires a loadResource function.")
  }

  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new ForbiddenError("User context not found."))
      }

      const allowed = await can({
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

      const resourceId = getResourceId
        ? getResourceId(req)
        : req.params?.id

      const resourceInstance = await loadResource(resourceId, req)

      if (!resourceInstance) {
        return next(new ForbiddenError("Resource access is not allowed."))
      }

      const authorizationContext = await getAuthorizationContext(req.user.id)

      if (policy) {
        await assertPolicy({
          policy,
          user: {
            id: req.user.id,
            role: authorizationContext.role,
          },
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
