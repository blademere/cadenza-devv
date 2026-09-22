import { pathToFileURL } from 'node:url'
import { disconnectPrisma } from '../../infrastructure/database/prisma.js'
import { logger } from '../../config/index.js'
import { runLifecycleMaintenance } from './lessons/lesson-lifecycle.service.js'

const DEFAULT_INTERVAL_MS = 60_000

const startCadenzaWorker = async ({ intervalMs = DEFAULT_INTERVAL_MS } = {}) => {
  if (!Number.isInteger(intervalMs) || intervalMs < 1000) throw new RangeError('intervalMs must be at least 1000 milliseconds.')
  let stopping = false
  const shutdown = () => { stopping = true }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)

  try {
    while (!stopping) {
      try {
        const result = await runLifecycleMaintenance()
        if (result.expiredEnrollments.expired || result.missedSessions.missed) {
          logger.info({ result }, 'Cadenza lifecycle maintenance completed')
        }
      } catch (error) {
        logger.error({ err: error }, 'Cadenza lifecycle maintenance failed')
      }
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  } finally {
    await disconnectPrisma()
  }
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMainModule) {
  startCadenzaWorker().catch((error) => {
    logger.error({ err: error }, 'Cadenza worker stopped unexpectedly')
    process.exitCode = 1
  })
}

export { DEFAULT_INTERVAL_MS, startCadenzaWorker }
