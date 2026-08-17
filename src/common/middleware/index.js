const asyncHandler = require('./asyncHandler')
const authenticate = require('./authenticate')
const authorize = require('./authorize')
const authorizeResource = require('./authorizeResource')
const validate = require('./validate')
const errorHandler = require('./errorHandler')
const notFound = require('./notFound')
const rateLimiter = require('./rateLimiter')
const {
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
} = require('./authRateLimiter')

module.exports = {
  asyncHandler,
  authenticate,
  authorize,
  authorizeResource,
  validate,
  errorHandler,
  notFound,
  rateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
}
