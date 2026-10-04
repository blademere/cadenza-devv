import { startWorker } from './platform/platform-worker.js'

const startApplicationWorker = async (options = {}) => startWorker(options)

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  startApplicationWorker().catch((error) => {
    process.exitCode = 1
  })
}

export { startApplicationWorker }
