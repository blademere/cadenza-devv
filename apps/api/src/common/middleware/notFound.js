import { NotFoundError } from '../errors/appError.js'

const notFound = (req, _res, next) => {
  return next(new NotFoundError(`Route not found: ${req.originalUrl}`))
}

export default notFound
export { notFound }
