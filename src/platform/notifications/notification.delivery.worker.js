const { registerJobWorker } = require("../jobs/job.worker")
const { JOB_NAMES, JOB_QUEUES } = require("../jobs/job.constants")
const { getPrismaClient } = require("../../infrastructure/database/prisma")

async function processNotificationDelivery(job) {
  const prisma = getPrismaClient()
  const { deliveryId } = job.data
  if (!deliveryId) throw new Error("deliveryId is required")

  const delivery = await prisma.notificationDelivery.findUnique({
    where: { id: deliveryId },
  })

  if (!delivery || delivery.status === "SENT") return

  await prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  })

  // Transport adapters are intentionally application-configurable.
  // A transport should be registered before this worker is enabled in production.
  throw new Error(`No transport registered for notification channel: ${delivery.channel}`)
}

function createNotificationDeliveryWorker(options = {}) {
  return registerJobWorker({
    queue: JOB_QUEUES.NOTIFICATIONS,
    name: JOB_NAMES.NOTIFICATION_DELIVERY,
    processor: processNotificationDelivery,
    concurrency: options.concurrency || 5,
  })
}

module.exports = {
  processNotificationDelivery,
  createNotificationDeliveryWorker,
}
