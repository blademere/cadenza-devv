import { JOB_QUEUES } from './job.constants.js'
import { enqueueJob as enqueueBullMqJob } from '../../infrastructure/queue/bullmq.js'
import { getContext } from '../context/context.service.js'

const DEFAULT_ATTEMPTS = 5
const DEFAULT_BACKOFF_DELAY = 1000
const SUPPORTED_QUEUES = new Set(Object.values(JOB_QUEUES))

function normalizeJobId(jobId) {
  if (jobId === undefined || jobId === null) return undefined
  const normalized = String(jobId).replace(/:/g, '-')
  return normalized || undefined
}

function buildJobData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data

  const context = getContext()
  if (!context?.correlationId && !context?.requestId) return data

  return {
    ...data,
    _platformContext: {
      requestId: context.requestId,
      correlationId: context.correlationId,
      actorId: context.actorId,
      actorType: context.actorType,
      organizationId: context.organizationId,
    },
  }
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

    return enqueue(queue, name, buildJobData(data), {
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

export {
  createJobService,
  enqueueJob,
  buildJobData,
}
