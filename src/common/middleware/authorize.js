const { ForbiddenError } = require("../errors/appError")
const {
  userHasPermission,
} = require("../../features/auth/authorization.repository")

const authorize = (moduleKey, action) => {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new ForbiddenError("User context not found."))
      }

      const allowed = await userHasPermission(req.user.id, moduleKey, action)

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
