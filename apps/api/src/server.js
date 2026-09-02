import app from './app.js'
import { env, logger } from './config/index.js'
import {
  initializeSentry,
  flushSentry,
} from './infrastructure/monitoring/sentry.js'
import { disconnectPrisma } from './infrastructure/database/prisma.js'
import { disconnectRedis } from './infrastructure/cache/redis.js'

initializeSentry()

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT }, 'Server started')
})

let shuttingDown = false

const shutdown = async (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, 'Shutdown initiated')

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
  forceExit.unref?.()

  try {
    await new Promise((resolve) => server.close(resolve))
    await Promise.allSettled([disconnectRedis(), disconnectPrisma()])
    await flushSentry()
    clearTimeout(forceExit)
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Graceful shutdown failed')
    clearTimeout(forceExit)
    process.exit(1)
  }
}

process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT', () => shutdown('SIGINT'))

export { server, shutdown }
export default app
