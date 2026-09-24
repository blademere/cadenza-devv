import { Queue, QueueEvents, Worker } from 'bullmq'
import { connectRedis, getRedisClient } from '../cache/redis.js'
import { logger } from '../../config/index.js'
import { increment } from '../../platform/observability/metrics/metrics.service.js'

const createBullMqInfrastructure = ({
  Queue: QueueClass = Queue,
  QueueEvents: QueueEventsClass = QueueEvents,
  Worker: WorkerClass = Worker,
  connectRedis: connectRedisFn = connectRedis,
  getRedisClient: getRedisClientFn = getRedisClient,
  logger: loggerInstance = logger,
} = {}) => {
  const queues = new Map()
  const workers = new Set()
  const queueEvents = new Set()

  const getConnection = async () => {
    await connectRedisFn()
    return getRedisClientFn()
  }

  const getQueue = async (queueName) => {
    if (!queueName) throw new Error('queueName is required')

    if (!queues.has(queueName)) {
      const connection = await getConnection()
      queues.set(
        queueName,
        new QueueClass(queueName, {
          connection,
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { age: 86400, count: 1000 },
            removeOnFail: false,
          },
        })
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
    increment('platform.job.retries', { queue: queueName, jobType: job.name })
    return job
  }

  const registerWorker = async (queueName, processor, options = {}) => {
    if (!queueName || typeof processor !== 'function') {
      throw new TypeError('queueName and processor are required')
    }

    const connection = await getConnection()
    const worker = new WorkerClass(queueName, processor, {
      connection,
      concurrency: options.concurrency || 10,
      ...options,
    })

    worker.on('completed', (job) => {
      const duration =
        Number.isFinite(job?.finishedOn) && Number.isFinite(job?.processedOn)
          ? job.finishedOn - job.processedOn
          : undefined
      const platformContext = job?.data?._platformContext
      increment('platform.job.completed', { queue: queueName, jobType: job?.name })
      loggerInstance.info(
        {
          queue: queueName,
          jobId: job.id,
          jobType: job.name,
          attempts: job.attemptsMade,
          maxAttempts: job.opts?.attempts,
          duration,
          requestId: platformContext?.requestId,
          correlationId: platformContext?.correlationId,
          actorId: platformContext?.actorId,
        },
        'Platform job completed'
      )
    })
    worker.on('failed', (job, error) => {
      const duration =
        Number.isFinite(job?.finishedOn) && Number.isFinite(job?.processedOn)
          ? job.finishedOn - job.processedOn
          : undefined
      const platformContext = job?.data?._platformContext
      increment('platform.job.failed', { queue: queueName, jobType: job?.name })
      if ((job?.attemptsMade || 0) < (job?.opts?.attempts || 0)) {
        increment('platform.job.retries', { queue: queueName, jobType: job?.name })
      }
      loggerInstance.error(
        {
          queue: queueName,
          jobId: job?.id,
          jobType: job?.name,
          attempts: job?.attemptsMade,
          maxAttempts: job?.opts?.attempts,
          duration,
          requestId: platformContext?.requestId,
          correlationId: platformContext?.correlationId,
          actorId: platformContext?.actorId,
          err: error,
        },
        'Platform job failed'
      )
    })
    worker.on('error', (error) => {
      loggerInstance.error(
        { queue: queueName, err: error },
        'BullMQ worker error'
      )
    })

    workers.add(worker)
    return worker
  }

  const getQueueEvents = async (queueName) => {
    const connection = await getConnection()
    const events = new QueueEventsClass(queueName, { connection })
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

  return {
    enqueueJob,
    getQueue,
    getFailedJobs,
    retryFailedJob,
    getQueueEvents,
    registerWorker,
    closeQueues,
  }
}

const { enqueueJob, getQueue, getFailedJobs, retryFailedJob, getQueueEvents, registerWorker, closeQueues } = createBullMqInfrastructure()

export {
  enqueueJob,
  getQueue,
  getFailedJobs,
  retryFailedJob,
  getQueueEvents,
  registerWorker,
  closeQueues,
  createBullMqInfrastructure,
}
