const { Queue, QueueEvents, Worker } = require('bullmq')
const { env, logger } = require('../../config')

const queues = new Map()
const workers = new Set()
const queueEvents = new Set()

const createConnectionOptions = () => {
  const url = new URL(env.REDIS_URL)
  const options = {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null,
  }

  if (url.username) options.username = decodeURIComponent(url.username)
  if (url.password) options.password = decodeURIComponent(url.password)
  if (url.pathname && url.pathname !== '/') options.db = Number(url.pathname.slice(1))
  if (url.protocol === 'rediss:') options.tls = {}

  return options
}

const getQueue = async (queueName) => {
  if (!queueName) throw new Error('queueName is required')

  if (!queues.has(queueName)) {
    queues.set(
      queueName,
      new Queue(queueName, {
        connection: createConnectionOptions(),
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { age: 86400, count: 1000 },
          removeOnFail: false,
        },
      }),
    )
  }

  return queues.get(queueName)
}

const enqueueJob = async (queueName, name, payload, options = {}) => {
  const queue = await getQueue(queueName)
  return queue.add(name, payload, options)
}

const getFailedJobs = async (queueName, start = 0, end = 99) => {
  const queue = await getQueue(queueName)
  return queue.getFailed(start, end)
}

const retryFailedJob = async (queueName, jobId) => {
  if (!jobId) throw new Error('jobId is required')
  const queue = await getQueue(queueName)
  const job = await queue.getJob(jobId)
  if (!job) throw new Error(`BullMQ job ${jobId} was not found.`)
  await job.retry('failed')
  return job
}

const registerWorker = async (queueName, processor, options = {}) => {
  if (!queueName || typeof processor !== 'function') {
    throw new TypeError('queueName and processor are required')
  }

  const worker = new Worker(queueName, processor, {
    connection: createConnectionOptions(),
    concurrency: options.concurrency || 10,
    ...options,
  })

  worker.on('completed', (job) => {
    logger.info(
      { queue: queueName, jobId: job.id },
      'BullMQ job completed',
    )
  })
  worker.on('failed', (job, error) => {
    logger.error(
      { queue: queueName, jobId: job?.id, err: error },
      'BullMQ job failed',
    )
  })
  worker.on('error', (error) => {
    logger.error({ queue: queueName, err: error }, 'BullMQ worker error')
  })

  workers.add(worker)
  return worker
}

const getQueueEvents = async (queueName) => {
  const events = new QueueEvents(queueName, {
    connection: createConnectionOptions(),
  })
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
  getFailedJobs,
  retryFailedJob,
  getQueueEvents,
  registerWorker,
  closeQueues,
}
