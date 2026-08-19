const asyncHandler = require('./asyncHandler')
const validate = require('./validate')
const errorHandler = require('./errorHandler')
const notFound = require('./notFound')
const rateLimiter = require('./rateLimiter')
const requestId = require('./requestId')
const idempotency = require('./idempotency')
const cache = require('./cache')
const {
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
} = require('./authRateLimiter')

module.exports = {
  asyncHandler,
  validate,
  errorHandler,
  notFound,
  rateLimiter,
  requestId,
  idempotency,
  cache,
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
}
