import env from '../../config/env.js'
import {
  CONFIGURATION_NAMESPACES,
  PLATFORM_CONFIGURATION_KEYS,
} from './configuration.constants.js'

const PLATFORM_VALUES = Object.freeze({
  [PLATFORM_CONFIGURATION_KEYS.AUTHORIZATION_CACHE_ENABLED]: env.AUTHORIZATION_CACHE_ENABLED,
  [PLATFORM_CONFIGURATION_KEYS.AUTHORIZATION_CACHE_TRUST_POSITIVE]: env.AUTHORIZATION_CACHE_TRUST_POSITIVE,
})

const namespaceOf = (key) => {
  if (typeof key !== 'string' || !key.includes('.')) return null
  return key.split('.')[0]
}

export const getConfiguration = (key) => {
  if (!Object.hasOwn(PLATFORM_VALUES, key)) return undefined
  return PLATFORM_VALUES[key]
}

export const requireConfiguration = (key) => {
  const value = getConfiguration(key)
  if (value === undefined) throw new Error(`Unknown platform configuration key: ${key}`)
  return value
}

export const getPlatformConfiguration = () => ({ ...PLATFORM_VALUES })

export const isPlatformConfigurationKey = (key) => Object.hasOwn(PLATFORM_VALUES, key)

export const isSupportedConfigurationNamespace = (namespace) =>
  Object.values(CONFIGURATION_NAMESPACES).includes(namespace)

export const getConfigurationNamespace = (key) => namespaceOf(key)
