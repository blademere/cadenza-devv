let configuredStorage

const configureStorageService = (storageService) => {
  if (!storageService || typeof storageService.put !== 'function' || typeof storageService.get !== 'function' || typeof storageService.delete !== 'function') {
    throw new TypeError('A valid storage service is required')
  }

  configuredStorage = storageService
  return configuredStorage
}

const getStorageService = () => {
  if (!configuredStorage) {
    throw new Error('Storage service has not been configured')
  }

  return configuredStorage
}

export { configureStorageService, getStorageService }
