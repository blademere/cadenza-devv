import { registerWorker } from '../../infrastructure/queue/bullmq.js'
import { JOB_QUEUES } from './job.constants.js'

function createJobWorker({ queue, processor, concurrency = 5 }) {
  return registerWorker(queue, processor, { concurrency })
}

function registerJobWorker({ queue, name, processor, concurrency }) {
  return createJobWorker({
    queue,
    concurrency,
    processor: async (job) => {
      if (job.name !== name) return
      return processor(job)
    },
  })
}

export {
  JOB_QUEUES,
  createJobWorker,
  registerJobWorker,
}
