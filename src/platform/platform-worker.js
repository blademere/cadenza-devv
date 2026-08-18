const {
  getPrismaClient,
  disconnectPrisma,
} = require('../infrastructure/database/prisma')
const { markDueSlas, markEscalations } = require('./sla/sla.service')
const { processEvent } = require('./event-bus/event-bus')
const {
  enqueueEvent,
  claimBatch,
  markProcessed,
  markFailed,
  recoverStale,
} = require('./event-bus/event-outbox.service')
const {
  enqueueJob,
  registerWorker,
  closeQueues,
} = require('../infrastructure/queue/bullmq')
const { logger } = require('../config')

const prisma = getPrismaClient()
const EVENT_QUEUE = 'platform-events'

const runPlatformMaintenance = async ({
  now = new Date(),
  batchSize = 100,
} = {}) => {
  const [due, escalated] = await Promise.all([
    markDueSlas({ now }),
    markEscalations({ now }),
    recoverStale(),
  ])

  const events = []
  for (const id of due?.ids || []) events.push({ event: 'sla.breached', id })
  for (const id of escalated?.ids || []) {
    events.push({ event: 'sla.escalated', id })
  }

  for (const item of events.slice(0, batchSize)) {
    const instance = await prisma.slaInstance.findUnique({
      where: { id: item.id },
    })
    if (!instance) continue

    const context = {
      slaInstanceId: instance.id,
      subjectType: instance.subjectType,
      subjectId: instance.subjectId,
      event: item.event,
    }

    await enqueueEvent({
      event: item.event,
      entityType: instance.subjectType,
      entityId: instance.subjectId,
      context,
      idempotencyKey: `sla:${instance.id}:${item.event}`,
    })
  }

  return { due: due?.count || 0, escalated: escalated?.count || 0 }
}

const publishOutbox = async ({ batchSize = 50, leaseSeconds } = {}) => {
  const claimed = await claimBatch({ batchSize, leaseSeconds })
  let published = 0
  let failed = 0

  for (const item of claimed) {
    try {
      await enqueueJob(EVENT_QUEUE, 'platform-event', item.payload, {
        jobId: item.id,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      })
      await markProcessed(item.id, item.lockToken)
      published += 1
    } catch (error) {
      try {
        await markFailed(item.id, error, item.lockToken)
      } catch (ownershipError) {
        logger.error(
          { err: ownershipError, originalError: error, eventId: item.id },
          'Failed to mark outbox event after publish error',
        )
      }
      failed += 1
    }
  }

  return { claimed: claimed.length, published, failed }
}

const startEventWorker = async (options = {}) => {
  return registerWorker(
    EVENT_QUEUE,
    async (job) => processEvent(job.data),
    { concurrency: options.concurrency || 10 },
  )
}

const processOutbox = publishOutbox

const runWorkerCycle = async (options = {}) => {
  const maintenance = await runPlatformMaintenance(options)
  const outbox = await publishOutbox(options)
  return { maintenance, outbox }
}

const startWorker = async ({ intervalMs = 5000, batchSize = 50 } = {}) => {
  let stopping = false

  const shutdown = () => {
    stopping = true
    logger.info('Platform worker shutdown requested')
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)

  try {
    await startEventWorker()
    while (!stopping) {
      try {
        await runWorkerCycle({ batchSize })
      } catch (error) {
        logger.error({ err: error }, 'Platform worker cycle failed')
      }
      if (!stopping) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
      }
    }
  } finally {
    await closeQueues()
    await disconnectPrisma()
    logger.info('Platform worker stopped')
  }
}

if (require.main === module) {
  startWorker().catch((error) => {
    logger.error({ err: error }, 'Platform worker stopped unexpectedly')
    process.exitCode = 1
  })
}

module.exports = {
  EVENT_QUEUE,
  runPlatformMaintenance,
  processOutbox,
  publishOutbox,
  startEventWorker,
  runWorkerCycle,
  startWorker,
}
