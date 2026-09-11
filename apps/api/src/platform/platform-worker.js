import { pathToFileURL } from 'node:url'

import { disconnectPrisma } from '../infrastructure/database/prisma.js'
import { deleteExpiredRefreshTokens } from '../infrastructure/maintenance/auth-token.js'
import { processEvent } from './event-bus/event-bus.js'
import {
  claimBatch,
  markProcessed,
  markFailed,
  recoverStale,
} from './event-bus/event-outbox.service.js'
import {
  enqueueJob,
  registerWorker,
  closeQueues,
} from '../infrastructure/queue/bullmq.js'
import { logger } from '../config/index.js'
import { withContext } from './context/context.service.js'

const EVENT_QUEUE = 'platform-events'

const runPlatformMaintenance = async ({ staleLeaseSeconds } = {}) => {
  const recovered = await recoverStale({ timeoutSeconds: staleLeaseSeconds })
  const deletedRefreshTokens = await deleteExpiredRefreshTokens()
  return { recovered, deletedRefreshTokens: deletedRefreshTokens.count }
}

const publishOutbox = async ({ batchSize = 50, leaseSeconds } = {}) => {
  const claimed = await claimBatch({ batchSize, leaseSeconds })
  let published = 0
  let failed = 0
  for (const item of claimed) {
    try {
      await enqueueJob(EVENT_QUEUE, 'platform-event', item.payload, { jobId: item.id, attempts: 5, backoff: { type: 'exponential', delay: 1000 } })
      await markProcessed(item.id, item.lockToken)
      published += 1
    } catch (error) {
      try { await markFailed(item.id, error, item.lockToken) } catch (ownershipError) {
        logger.error({ err: ownershipError, originalError: error, eventId: item.id }, 'Failed to mark outbox event after publish error')
      }
      failed += 1
    }
  }
  return { claimed: claimed.length, published, failed }
}

const startEventWorker = async (options = {}) =>
  registerWorker(
    EVENT_QUEUE,
    async (job) => {
      const event = job.data
      const context = {
        requestId: event?.context?._platformContext?.requestId || null,
        correlationId: event?.correlationId || null,
        actorId: event?.actorId || null,
        actorType: event?.context?._platformContext?.actorType || null,
        organizationId: event?.context?._platformContext?.organizationId || null,
      }
      return withContext(context, () => processEvent(event))
    },
    { concurrency: options.concurrency || 10 },
  )

const processOutbox = publishOutbox
const runWorkerCycle = async (options = {}) => ({ maintenance: await runPlatformMaintenance(options), outbox: await publishOutbox(options) })

const startWorker = async ({ intervalMs = 5000, batchSize = 50 } = {}) => {
  let stopping = false
  const shutdown = () => { stopping = true; logger.info('Platform worker shutdown requested') }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  try {
    await startEventWorker()
    while (!stopping) {
      try { await runWorkerCycle({ batchSize }) } catch (error) { logger.error({ err: error }, 'Platform worker cycle failed') }
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  } finally {
    await closeQueues()
    await disconnectPrisma()
    logger.info('Platform worker stopped')
  }
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMainModule) {
  startWorker().catch((error) => {
    logger.error({ err: error }, 'Platform worker stopped unexpectedly')
    process.exitCode = 1
  })
}

export {
  EVENT_QUEUE,
  runPlatformMaintenance,
  processOutbox,
  publishOutbox,
  startEventWorker,
  runWorkerCycle,
  startWorker,
}
