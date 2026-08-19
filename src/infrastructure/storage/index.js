const path = require("node:path")
const env = require("../../config/env")
const { createStorageService } = require("../../platform/storage/storage.service")
const { configureStorageService } = require("../../platform/storage/storage.registry")
const { createLocalStorageAdapter } = require("./local.storage")

function createConfiguredStorageService() {
  if (env.STORAGE_PROVIDER !== "local") {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${env.STORAGE_PROVIDER}`)
  }

  const root = path.resolve(env.STORAGE_LOCAL_ROOT)
  return createStorageService(createLocalStorageAdapter({ root }), {
    provider: env.STORAGE_PROVIDER,
  })
}

const storage = createConfiguredStorageService()
configureStorageService(storage)

module.exports = storage
