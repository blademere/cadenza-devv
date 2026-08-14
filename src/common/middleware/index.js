const asyncHandler = require('./asyncHandler')
const authenticate = require('./authenticate')
const authorize = require('./authorize')
const validate = require('./validate')
const errorHandler = require('./errorHandler')
const notFound = require('./notFound')
const rateLimiter = require('./rateLimiter')
const {
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
} = require('./authRateLimiter')

module.exports = {
  asyncHandler,
  authenticate,
  authorize,
  validate,
  errorHandler,
  notFound,
  rateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
}
