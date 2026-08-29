const { registerWorker } = require("../../infrastructure/queue/bullmq")
const { JOB_QUEUES } = require("./job.constants")

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

module.exports = {
  JOB_QUEUES,
  createJobWorker,
  registerJobWorker,
}
