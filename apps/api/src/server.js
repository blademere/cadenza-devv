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
  server.ref()
  logger.info({ port: env.PORT }, 'Server started')
})

server.on('error', (error) => {
  logger.error({ err: error }, 'HTTP server error')
})

server.on('close', () => {
  logger.info('HTTP server closed')
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

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception')
  void shutdown('uncaughtException')
})

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection')
  void shutdown('unhandledRejection')
})

let exitDiagnosticLogged = false
process.once('beforeExit', (code) => {
  if (exitDiagnosticLogged) return
  exitDiagnosticLogged = true

  logger.warn({
    code,
    serverListening: server.listening,
    serverAddress: server.address(),
    activeHandles: typeof process._getActiveHandles === 'function'
      ? process._getActiveHandles().map((handle) => handle?.constructor?.name || 'unknown')
      : [],
  }, 'Node process is exiting while the HTTP server is expected to be running')
})

export { server, shutdown }
export default app
