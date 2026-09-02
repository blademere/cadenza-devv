class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message)

    this.name = this.constructor.name
    this.statusCode = statusCode
    this.errors = errors

    Error.captureStackTrace(this, this.constructor)
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request.', errors = []) {
    super(message, 400, errors)
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized.', errors = []) {
    super(message, 401, errors)
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden.', errors = []) {
    super(message, 403, errors)
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found.', errors = []) {
    super(message, 404, errors)
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict detected.', errors = []) {
    super(message, 409, errors)
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed.', errors = []) {
    super(message, 422, errors)
  }
}

export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
}
