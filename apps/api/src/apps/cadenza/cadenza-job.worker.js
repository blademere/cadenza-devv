import { registerJobWorker } from '../../platform/jobs/job.worker.js'
import { JOB_QUEUES, JOB_NAMES } from '../../platform/jobs/job.constants.js'
import { runLifecycleMaintenance } from './lessons/lesson-lifecycle.service.js'

const processCadenzaLifecycleMaintenance = async () => runLifecycleMaintenance()

const startCadenzaJobWorker = ({ concurrency = 1 } = {}) =>
  registerJobWorker({
    queue: JOB_QUEUES.CADENZA,
    name: JOB_NAMES.CADENZA_LIFECYCLE_MAINTENANCE,
    concurrency,
    processor: processCadenzaLifecycleMaintenance,
  })

export {
  processCadenzaLifecycleMaintenance,
  startCadenzaJobWorker,
}
