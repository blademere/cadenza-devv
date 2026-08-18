const { Queue, QueueEvents, Worker } = require('bullmq')
const { connectRedis, getRedisClient } = require('../cache/redis')
const { logger } = require('../../config')

const queues = new Map()
const workers = new Set()
const queueEvents = new Set()

const getConnection = () => getRedisClient()

const getQueue = async (queueName) => {
  if (!queueName) throw new Error('queueName is required')
  await connectRedis()
  if (!queues.has(queueName)) {
    queues.set(queueName, new Queue(queueName, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: false,
      },
    }))
  }
  return queues.get(queueName)
}

const enqueueJob = async (queueName, name, payload, options = {}) => {
  const queue = await getQueue(queueName)
  return queue.add(name, payload, options)
}

const registerWorker = async (queueName, processor, options = {}) => {
  if (!queueName || typeof processor !== 'function') {
    throw new TypeError('queueName and processor are required')
  }
  await connectRedis()
  const worker = new Worker(queueName, processor, {
    connection: getConnection(),
    concurrency: options.concurrency || 10,
    ...options,
  })
  worker.on('completed', (job) => logger.info({ queue: queueName, jobId: job.id }, 'BullMQ job completed'))
  worker.on('failed', (job, error) => logger.error({ queue: queueName, jobId: job?.id, err: error }, 'BullMQ job failed'))
  worker.on('error', (error) => logger.error({ queue: queueName, err: error }, 'BullMQ worker error'))
  workers.add(worker)
  return worker
}

const getQueueEvents = async (queueName) => {
  await connectRedis()
  const events = new QueueEvents(queueName, { connection: getConnection() })
  queueEvents.add(events)
  return events
}

const closeQueues = async () => {
  await Promise.all([...workers].map((worker) => worker.close()))
  await Promise.all([...queueEvents].map((events) => events.close()))
  await Promise.all([...queues.values()].map((queue) => queue.close()))
  workers.clear()
  queueEvents.clear()
  queues.clear()
}

module.exports = {
  enqueueJob,
  getQueue,
  getQueueEvents,
  registerWorker,
  closeQueues,
}
