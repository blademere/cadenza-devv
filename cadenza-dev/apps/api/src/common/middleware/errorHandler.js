import { AppError } from '../errors/appError.js'
import { errorResponse } from '../responses/apiResponse.js'
import { logger } from '../../config/index.js'
import { captureException } from '../../infrastructure/monitoring/sentry.js'

const errorHandler = (error, req, res, _next) => {
  if (!(error instanceof AppError)) {
    captureException(error, {
      userId: req.user?.id,
      request: {
        method: req.method,
        path: req.originalUrl,
        requestId: req.requestId,
        correlationId: req.correlationId,
      },
    })
  }

  if (error instanceof AppError) {
    logger.warn(
      {
        err: error,
        requestId: req.requestId,
        correlationId: req.correlationId,
        statusCode: error.statusCode,
        errors: error.errors,
      },
      error.message,
    )

    return errorResponse(res, error.message, error.errors, error.statusCode)
  }

  logger.error(
    {
      err: error,
      requestId: req.requestId,
      correlationId: req.correlationId,
      errorName: error?.name,
      errorCode: error?.code,
      errorMeta: error?.meta,
    },
    error?.message || 'Unexpected server error.',
  )

  return errorResponse(res, 'Internal server error.', [], 500)
}

export default errorHandler
export { errorHandler }
