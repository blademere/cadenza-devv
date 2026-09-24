import path from 'node:path'
import env from '../../config/env.js'
import { createStorageService } from '../../platform/storage/storage.service.js'
import { configureStorageService } from '../../platform/storage/storage.registry.js'
import { createLocalStorageAdapter } from './local.storage.js'

function createConfiguredStorageService() {
  if (env.STORAGE_PROVIDER !== 'local') {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${env.STORAGE_PROVIDER}`)
  }

  const root = path.resolve(env.STORAGE_LOCAL_ROOT)
  return createStorageService(createLocalStorageAdapter({ root }), {
    provider: env.STORAGE_PROVIDER,
  })
}

const storage = createConfiguredStorageService()
configureStorageService(storage)

export default storage
export { storage, createConfiguredStorageService }
