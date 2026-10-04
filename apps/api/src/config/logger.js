import pino from 'pino'
import pinoHttp from 'pino-http'

import { getContext } from '../platform/context/context.service.js'

const isProduction = process.env.NODE_ENV === 'production'
const isVercel = process.env.VERCEL === '1'
const usePrettyTransport = !isProduction && !isVercel

const logger = pino({
  level: isProduction ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
      'req.body.refreshToken',
      'req.body.accessToken',
      'req.body.token',
      'req.body.clientSecret',
      'req.body.secret',
      'req.body.apiKey',
      "res.headers['set-cookie']",
    ],
    censor: '[REDACTED]',
  },
  ...(usePrettyTransport
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})

const requestLogger = pinoHttp({
  logger,
  autoLogging: true,
  genReqId: (req) => req.requestId,
  customProps: (req, res) => {
    const context = getContext() || {}
    return {
      operation: `${req.method} ${req.originalUrl || req.url}`,
      requestId: req.requestId || context.requestId || null,
      correlationId: req.correlationId || context.correlationId || null,
      actorId: context.actorId || null,
      duration: res.responseTime ?? null,
    }
  },
  serializers: {
    req: () => undefined,
    res: () => undefined,
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode}`
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${err.message}`
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
})

export { logger, requestLogger }
