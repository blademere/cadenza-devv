const { AppError } = require("../errors/appError")

const { errorResponse } = require("../responses/apiResponse")

const { logger } = require("../../config")

const errorHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    logger.warn(error.message, {
      statusCode: error.statusCode,

      errors: error.errors,
    })

    return errorResponse(res, error.message, error.errors, error.statusCode)
  }

  logger.error(error.message || "Unexpected server error.", {
    stack: error.stack,
  })

  return errorResponse(res, "Internal server error.", [], 500)
}

module.exports = errorHandler
