const { ForbiddenError } = require("../errors/appError")
const { can } = require("../../features/access-control/access-control.service")

const authorize = (resource, action) => {
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

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

module.exports = authorize
