const { registerJobWorker } = require('../jobs/job.worker')
const { JOB_NAMES, JOB_QUEUES } = require('../jobs/job.constants')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const {
  claimDelivery,
  markDeliverySent,
  markDeliveryFailed,
} = require('./notification.service')
const { getNotificationTransport } = require('./notification.transport')

async function processNotificationDelivery(job) {
  const prisma = getPrismaClient()
  const { deliveryId } = job.data || {}
  if (!deliveryId) throw new Error('deliveryId is required')

  const result = await claimDelivery({ id: deliveryId })
  if (!result.claimed) return result.delivery

  const delivery = result.delivery
  const transport = getNotificationTransport(delivery.channel)

  if (!transport) {
    const error = new Error(
      `No transport registered for notification channel: ${delivery.channel}`
    )
    await markDeliveryFailed(delivery.id, error)
    throw error
  }

  try {
    await transport.send({
      delivery,
      recipient: delivery.recipient,
      payload: delivery.payload,
    })
    return await markDeliverySent(delivery.id)
  } catch (error) {
    await markDeliveryFailed(delivery.id, error)
    throw error
  }
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
