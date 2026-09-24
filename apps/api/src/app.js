import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import cors from 'cors'
import hpp from 'hpp'
import compression from 'compression'
import crypto from 'node:crypto'

import {
  prometheusMiddleware,
  metricsHandler,
  recordDependencyHealth,
  recordDependencyLatency,
} from './infrastructure/monitoring/prometheus.js'

import { getPrismaClient } from './infrastructure/database/prisma.js'
import { connectRedis } from './infrastructure/cache/redis.js'
import './infrastructure/storage/index.js'
import './infrastructure/payments/payment-provider.bootstrap.js'

import {
  rateLimiter,
  requestId,
  notFound,
  errorHandler,
} from './common/middleware/index.js'
import originProtection from './common/middleware/originProtection.js'
import { contextMiddleware } from './platform/context/index.js'

import { env, requestLogger } from './config/index.js'
import { createCorsOptions } from './config/cors.js'
import apiRoutes from './routes/index.js'
import { registerSwagger } from './infrastructure/docs/swagger.js'
import { withTimeout } from './common/utils/withTimeout.js'

const app = express()

app.set('trust proxy', 1)
app.use(requestId)
app.use(contextMiddleware)
app.use(cookieParser())
app.use(requestLogger)
app.use(helmet())

app.use(cors(createCorsOptions(env.CORS_ORIGIN)))

app.use(originProtection)
app.use(hpp())
app.use(compression())
app.use('/api/v1/payments/webhooks', express.raw({ type: 'application/json', limit: '1mb' }))
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

export default app
