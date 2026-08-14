const { AppError } = require("../errors/appError")
const { errorResponse } = require("../responses/apiResponse")
const { logger } = require("../../config")
const { captureException } = require("../../infrastructure/monitoring/sentry")

const errorHandler = (error, req, res, _next) => {
  if (!(error instanceof AppError)) {
    captureException(error, {
      userId: req.user?.id,
      request: {
        method: req.method,
        path: req.originalUrl,
      },
    })
  }

  if (error instanceof AppError) {
    logger.warn(error.message, {
      statusCode: error.statusCode,
      details: error.details,
    })

    return errorResponse(res, error.message, error.details, error.statusCode)
  }

  logger.error(error.message || "Unexpected server error.", {
    stack: error.stack,
  })

  return errorResponse(res, "Internal server error.", [], 500)
}

module.exports = errorHandler
