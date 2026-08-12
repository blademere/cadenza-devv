const { NotFoundError } = require("../errors/appError");

const notFound = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.originalUrl}`));
};

module.exports = notFound;
