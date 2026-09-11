import { registerWorker } from '../../infrastructure/queue/bullmq.js'
import { JOB_QUEUES } from './job.constants.js'
import { withContext } from '../context/context.service.js'

const executeWithJobContext = async (job, processor) => {
  const context = job?.data?._platformContext
  if (!context) return processor(job)

  return withContext(context, () => processor(job))
}

function createJobWorker({ queue, processor, concurrency = 5 }) {
  return registerWorker(queue, (job) => executeWithJobContext(job, processor), { concurrency })
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
  executeWithJobContext,
}
