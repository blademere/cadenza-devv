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
import { startCadenzaJobWorker } from '../apps/cadenza/cadenza-job.worker.js'
import { scheduleEvery, removeSchedule } from './scheduler/scheduler.service.js'
import { JOB_QUEUES, JOB_NAMES } from './jobs/job.constants.js'

const EVENT_QUEUE = 'platform-events'
const EVENT_JOB_ATTEMPTS = 5
const EVENT_JOB_BACKOFF_DELAY = 1000
const CADENZA_LIFECYCLE_SCHEDULER_ID = 'cadenza-lifecycle-maintenance'

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
      await enqueueJob(EVENT_QUEUE, 'platform-event', item.payload, {
        jobId: item.id,
        attempts: EVENT_JOB_ATTEMPTS,
        backoff: { type: 'exponential', delay: EVENT_JOB_BACKOFF_DELAY },
      })
      await markProcessed(item.id, item.lockToken)
      published += 1
      logger.info(
        {
          eventId: item.id,
          eventType: item.event,
          correlationId: item.correlationId,
          attempts: item.attempts,
        },
        'Platform event queued'
      )
    } catch (error) {
      try {
        await markFailed(item.id, error, item.lockToken)
      } catch (ownershipError) {
        logger.error(
          { err: ownershipError, originalError: error, eventId: item.id },
          'Failed to mark outbox event after publish error'
        )
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
      const startedAt = Date.now()
      try {
        const result = await withContext(context, () => processEvent(event))
        logger.info(
          {
            eventId: event?.eventId || job.id,
            eventType: event?.event,
            jobId: job.id,
            attempts: job.attemptsMade,
            duration: Date.now() - startedAt,
            requestId: context.requestId,
            correlationId: context.correlationId,
            actorId: context.actorId,
          },
          'Platform event processed'
        )
        return result
      } catch (error) {
        logger.error(
          {
            eventId: event?.eventId || job.id,
            eventType: event?.event,
            jobId: job.id,
            attempts: job.attemptsMade,
            duration: Date.now() - startedAt,
            requestId: context.requestId,
            correlationId: context.correlationId,
            actorId: context.actorId,
            err: error,
          },
          'Platform event processing failed'
        )
        throw error
      }
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
    await startCadenzaJobWorker()
    await scheduleEvery({ schedulerId: CADENZA_LIFECYCLE_SCHEDULER_ID, queue: JOB_QUEUES.CADENZA, jobName: JOB_NAMES.CADENZA_LIFECYCLE_MAINTENANCE, every: 60000 })
    while (!stopping) {
      try { await runWorkerCycle({ batchSize }) } catch (error) { logger.error({ err: error }, 'Platform worker cycle failed') }
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  } finally {
    await removeSchedule({ schedulerId: CADENZA_LIFECYCLE_SCHEDULER_ID, queue: JOB_QUEUES.CADENZA }).catch(() => {})
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
  EVENT_JOB_ATTEMPTS,
  EVENT_JOB_BACKOFF_DELAY,
  runPlatformMaintenance,
  processOutbox,
  publishOutbox,
  startEventWorker,
  runWorkerCycle,
  startWorker,
}
