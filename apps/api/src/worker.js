import { startWorker } from './platform/platform-worker.js'
import {
  startCadenzaJobWorker,
  scheduleCadenzaLifecycle,
  unscheduleCadenzaLifecycle,
} from './apps/cadenza/cadenza-job.worker.js'

const startApplicationWorker = async (options = {}) =>
  startWorker({
    ...options,
    beforeStart: async () => {
      await startCadenzaJobWorker()
      await scheduleCadenzaLifecycle()
    },
    afterStop: async () => {
      await unscheduleCadenzaLifecycle()
    },
  })

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  startApplicationWorker().catch((error) => {
    process.exitCode = 1
  })
}

export { startApplicationWorker }
