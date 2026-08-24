const { AppError } = require('../errors/appError')
const { errorResponse } = require('../responses/apiResponse')
const { logger } = require('../../config')
const { captureException } = require('../../infrastructure/monitoring/sentry')

const errorHandler = (error, req, res, _next) => {
  if (!(error instanceof AppError)) {
    captureException(error, {
      userId: req.user?.id,
      request: {
        method: req.method,
        path: req.originalUrl,
        requestId: req.requestId,
      },
    })
  }

  if (error instanceof AppError) {
    logger.warn(
      {
        err: error,
        requestId: req.requestId,
        statusCode: error.statusCode,
        details: error.details,
      },
      error.message
    )

    return errorResponse(res, error.message, error.details, error.statusCode)
  }

  logger.error(
    {
      err: error,
      requestId: req.requestId,
      errorName: error?.name,
      errorCode: error?.code,
      errorMeta: error?.meta,
    },
    error?.message || 'Unexpected server error.'
  )

  return errorResponse(res, 'Internal server error.', [], 500)
}

module.exports = errorHandler
