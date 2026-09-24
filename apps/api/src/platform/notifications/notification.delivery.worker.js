import { registerJobWorker } from '../jobs/job.worker.js'
import { JOB_NAMES, JOB_QUEUES } from '../jobs/job.constants.js'
import * as notificationService from './notification.service.js'
import * as notificationTransport from './notification.transport.js'
import { increment } from '../observability/metrics/metrics.service.js'

async function processNotificationDelivery(job, dependencies = {}) {
  const { claimDelivery, markDeliverySent, markDeliveryFailed } = { ...notificationService, ...dependencies }
  const getNotificationTransport = dependencies.getNotificationTransport || notificationTransport.getNotificationTransport
  const { deliveryId } = job.data || {}
  if (!deliveryId) throw new Error('deliveryId is required')
  const result = await claimDelivery({ id: deliveryId })
  if (!result.claimed) return result.delivery
  const delivery = result.delivery
  const transport = getNotificationTransport(delivery.channel)
  if (!transport) {
    const error = new Error(`No transport registered for notification channel: ${delivery.channel}`)
    await markDeliveryFailed(delivery.id, error)
    increment('platform.notification.delivery.failed', { channel: delivery.channel })
    throw error
  }
  try {
    await transport.send({ delivery, recipient: delivery.recipient, payload: delivery.payload })
    const sent = await markDeliverySent(delivery.id)
    increment('platform.notification.delivery.sent', { channel: delivery.channel })
    return sent
  } catch (error) {
    await markDeliveryFailed(delivery.id, error)
    increment('platform.notification.delivery.failed', { channel: delivery.channel })
    throw error
  }
}
function createNotificationDeliveryWorker(options = {}) {
  return registerJobWorker({ queue: JOB_QUEUES.NOTIFICATIONS, name: JOB_NAMES.NOTIFICATION_DELIVERY, processor: processNotificationDelivery, concurrency: options.concurrency || 5 })
}

export { processNotificationDelivery, createNotificationDeliveryWorker }
