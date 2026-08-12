const { ForbiddenError } = require("../errors/appError");

const authorize = (allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ForbiddenError("User context not found."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError("You do not have permission to access this resource."));
    }

    return next();
  };
};

module.exports = authorize;
