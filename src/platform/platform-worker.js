const { logger } = require("../config")
const { processEvent, markProcessed, markFailed, claimPendingEvents } = require("./event-outbox")
const { runPlatformMaintenance } = require("./platform-maintenance")

const processClaimedEvents = async (claimed) => {
  let processed = 0
  let failed = 0
  for (const item of claimed) {
    try {
      await processEvent(item.payload)
      await markProcessed(item.id, item.lockToken)
      processed += 1
    } catch (error) {
      try {
        await markFailed(item.id, error, item.lockToken)
      } catch (ownershipError) {
        logger.error({ err: ownershipError, eventId: item.id }, "Failed to mark outbox event after processing error")
      }
      failed += 1
    }
  }
  return { claimed: claimed.length, processed, failed }
}

const runWorkerCycle = async (options = {}) => {
  const maintenance = await runPlatformMaintenance(options)
  const claimed = await claimPendingEvents(options.batchSize || 25)
  const events = await processClaimedEvents(claimed)
  return { maintenance, events }
}

let stopping = false

const startWorker = async () => {
  while (!stopping) {
    try {
      await runWorkerCycle()
    } catch (error) {
      logger.error({ err: error }, "Platform worker cycle failed")
    }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

const stopWorker = () => {
  stopping = true
}

if (require.main === module) {
  const shutdown = (signal) => {
    logger.info({ signal }, "Platform worker shutting down")
    stopWorker()
  }

  process.once("SIGTERM", () => shutdown("SIGTERM"))
  process.once("SIGINT", () => shutdown("SIGINT"))
  startWorker().catch((error) => {
    logger.fatal({ err: error }, "Platform worker terminated unexpectedly")
    process.exitCode = 1
  })
}

module.exports = { processClaimedEvents, runWorkerCycle, startWorker, stopWorker }
