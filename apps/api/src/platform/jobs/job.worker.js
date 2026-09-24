import { registerWorker } from '../../infrastructure/queue/bullmq.js'
import { JOB_QUEUES } from './job.constants.js'
import { withContext } from '../context/context.service.js'
import { instrument } from '../observability/observability.service.js'

const executeWithJobContext = async (job, processor) => {
  const context = job?.data?._platformContext
  const execute = () => processor(job)
  const labels = {
    queue: job?.queueName,
    jobType: job?.name,
  }

  const run = () => instrument(
    `job.${job?.name || 'unknown'}`,
    execute,
    {
      metric: 'platform.job.execution',
      labels,
      log: false,
    },
  )

  if (!context) return run()
  return withContext(context, run)
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
