const { JOB_QUEUES } = require('./job.constants')
const { enqueueJob: enqueueBullMqJob } = require('../../infrastructure/queue/bullmq')

const DEFAULT_ATTEMPTS = 5
const DEFAULT_BACKOFF_DELAY = 1000
const SUPPORTED_QUEUES = new Set(Object.values(JOB_QUEUES))

function normalizeJobId(jobId) {
  if (jobId === undefined || jobId === null) return undefined
  const normalized = String(jobId).replace(/:/g, '-')
  return normalized || undefined
}

function createJobService({ enqueue = enqueueBullMqJob } = {}) {
  async function enqueueJob({
    queue,
    name,
    data,
    jobId,
    delay = 0,
    attempts = DEFAULT_ATTEMPTS,
    backoffDelay = DEFAULT_BACKOFF_DELAY,
  }) {
    if (!queue || !name) throw new Error('queue and name are required')
    if (!SUPPORTED_QUEUES.has(queue)) throw new Error(`Unknown job queue: ${queue}`)

    return enqueue(queue, name, data, {
      jobId: normalizeJobId(jobId),
      delay,
      attempts,
      backoff: { type: 'exponential', delay: backoffDelay },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 5000 },
    })
  }

  return { enqueueJob }
}

const { enqueueJob } = createJobService()

module.exports = {
  createJobService,
  enqueueJob,
}
