import { registerJobWorker } from '../../platform/jobs/job.worker.js'
import { scheduleEvery, removeSchedule } from '../../platform/scheduler/scheduler.service.js'
import { JOB_QUEUES, JOB_NAMES } from '../../platform/jobs/job.constants.js'
import { runLifecycleMaintenance } from './lessons/lesson-lifecycle.service.js'

const processCadenzaLifecycleMaintenance = async () => runLifecycleMaintenance()

const CADENZA_LIFECYCLE_SCHEDULER_ID = 'cadenza-lifecycle-maintenance'

const startCadenzaJobWorker = ({ concurrency = 1 } = {}) =>
  registerJobWorker({
    queue: JOB_QUEUES.CADENZA,
    name: JOB_NAMES.CADENZA_LIFECYCLE_MAINTENANCE,
    concurrency,
    processor: processCadenzaLifecycleMaintenance,
  })

const scheduleCadenzaLifecycle = () => scheduleEvery({ schedulerId: CADENZA_LIFECYCLE_SCHEDULER_ID, queue: JOB_QUEUES.CADENZA, jobName: JOB_NAMES.CADENZA_LIFECYCLE_MAINTENANCE, every: 60000 })
const unscheduleCadenzaLifecycle = () => removeSchedule({ schedulerId: CADENZA_LIFECYCLE_SCHEDULER_ID, queue: JOB_QUEUES.CADENZA }).catch(() => {})

export {
  processCadenzaLifecycleMaintenance,
  startCadenzaJobWorker,
  scheduleCadenzaLifecycle,
  unscheduleCadenzaLifecycle,
}
