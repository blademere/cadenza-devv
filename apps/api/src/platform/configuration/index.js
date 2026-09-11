export {
  CONFIGURATION_NAMESPACES,
  PLATFORM_CONFIGURATION_KEYS,
} from './configuration.constants.js'

export {
  getConfiguration,
  requireConfiguration,
  getPlatformConfiguration,
  isPlatformConfigurationKey,
  isSupportedConfigurationNamespace,
  getConfigurationNamespace,
} from './configuration.service.js'
