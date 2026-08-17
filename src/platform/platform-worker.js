const prisma = require("../infrastructure/database/prisma")
const { markDueSlas, markEscalations } = require("./sla/sla.service")
const { queueNotifications } = require("./notifications/notification.service")
const { queueEvent } = require("./integrations/webhook.service")
const { processEvent } = require("./event-bus/event-bus")
const {
  claimBatch,
  markProcessed,
  markFailed,
  recoverStale,
} = require("./event-bus/event-outbox.service")

const runPlatformMaintenance = async ({ now = new Date(), batchSize = 100 } = {}) => {
  const [due, escalated] = await Promise.all([
    markDueSlas({ now }),
    markEscalations({ now }),
    recoverStale(),
  ])

  const events = []
  for (const id of due?.ids || []) events.push({ event: "sla.breached", id })
  for (const id of escalated?.ids || []) events.push({ event: "sla.escalated", id })

  for (const item of events.slice(0, batchSize)) {
    const instance = await prisma.slaInstance.findUnique({ where: { id: item.id } })
    if (!instance) continue
    const context = { slaInstanceId: instance.id, subjectType: instance.subjectType, subjectId: instance.subjectId, event: item.event }
    await queueNotifications({ event: item.event, entityType: instance.subjectType, context })
    await queueEvent({ event: item.event, entityType: instance.subjectType, entityId: instance.subjectId, payload: context })
  }

  return { due: due?.count || 0, escalated: escalated?.count || 0 }
}

const processOutbox = async ({ batchSize = 50 } = {}) => {
  const claimed = await claimBatch({ batchSize })
  let processed = 0
  let failed = 0
  for (const item of claimed) {
    try {
      await processEvent(item.payload)
      await markProcessed(item.id)
      processed += 1
    } catch (error) {
      await markFailed(item.id, error)
      failed += 1
    }
  }
  return { claimed: claimed.length, processed, failed }
}

const runWorkerCycle = async (options = {}) => {
  const maintenance = await runPlatformMaintenance(options)
  const outbox = await processOutbox(options)
  return { maintenance, outbox }
}

const startWorker = async ({ intervalMs = 5000, batchSize = 50 } = {}) => {
  let stopping = false
  const shutdown = () => { stopping = true }
  process.once("SIGTERM", shutdown)
  process.once("SIGINT", shutdown)

  while (!stopping) {
    await runWorkerCycle({ batchSize })
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

if (require.main === module) {
  startWorker().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { runPlatformMaintenance, processOutbox, runWorkerCycle, startWorker }
