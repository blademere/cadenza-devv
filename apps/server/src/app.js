const express = require('express')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const cors = require('cors')
const hpp = require('hpp')
const compression = require('compression')
const crypto = require('crypto')

const {
  prometheusMiddleware,
  metricsHandler,
  recordDependencyHealth,
  recordDependencyLatency,
} = require('./infrastructure/monitoring/prometheus')

const { getPrismaClient } = require('./infrastructure/database/prisma')
const { connectRedis } = require('./infrastructure/cache/redis')
require('./infrastructure/storage')

const {
  rateLimiter,
  requestId,
  notFound,
  errorHandler,
} = require('./common/middleware')
const originProtection = require('./common/middleware/originProtection')

const { env, requestLogger } = require('./config')
const apiRoutes = require('./routes')
const { registerSwagger } = require('./infrastructure/docs/swagger')
const { withTimeout } = require('./common/utils/withTimeout')

const app = express()
const allowedCorsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)

app.set('trust proxy', 1)
app.use(requestId)
app.use(cookieParser())
app.use(requestLogger)
app.use(helmet())

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, false)
      if (allowedCorsOrigins.includes(requestOrigin)) return callback(null, requestOrigin)
      return callback(new Error('CORS origin is not allowed.'))
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key'],
  })
)

app.use(originProtection)
app.use(hpp())
app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use(prometheusMiddleware)

const metricsTokenMatches = (providedToken) => {
  if (!env.METRICS_TOKEN || !providedToken) {
    return false
  }

  const expected = Buffer.from(env.METRICS_TOKEN)
  const provided = Buffer.from(providedToken)

  return (
    expected.length === provided.length &&
    crypto.timingSafeEqual(expected, provided)
  )
}

app.get('/metrics', (req, res, next) => {
  if (env.NODE_ENV !== 'production' && !env.METRICS_TOKEN) {
    return metricsHandler(req, res, next)
  }

  const authorization = req.get('authorization') || ''
  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !metricsTokenMatches(token)) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.',
      errors: [],
    })
  }

  return metricsHandler(req, res, next)
})

app.get('/health/live', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
  })
})

app.get('/health/ready', async (_req, res) => {
  const checks = {}
  let ready = true

  try {
    const prisma = getPrismaClient()
    const startedAt = process.hrtime.bigint()
    await withTimeout(
      prisma.$queryRaw`SELECT 1`,
      2000,
      'Database readiness check timed out'
    )
    recordDependencyLatency(
      'database',
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
    )
    recordDependencyHealth('database', true)
    checks.database = 'ok'
  } catch {
    ready = false
    recordDependencyHealth('database', false)
    checks.database = 'error'
  }

  try {
    const startedAt = process.hrtime.bigint()
    const redis = await withTimeout(
      connectRedis(),
      2000,
      'Redis connection timed out'
    )
    await withTimeout(redis.ping(), 2000, 'Redis readiness check timed out')
    recordDependencyLatency(
      'redis',
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
    )
    recordDependencyHealth('redis', true)
    checks.redis = 'ok'
  } catch {
    ready = false
    recordDependencyHealth('redis', false)
    checks.redis = 'error'
  }

  return res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ok' : 'not_ready',
    checks,
  })
})

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy.',
    data: {
      uptime: process.uptime(),
    },
  })
})

registerSwagger(app)

app.use(rateLimiter)
app.use('/api/v1', apiRoutes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
