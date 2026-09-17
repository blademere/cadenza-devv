import authorize from '../../../platform/authorization/authorize.js'
import authorizeResource from '../../../platform/authorization/authorization-resource.middleware.js'
import * as management from './authorization-management.service.js'

export const OBO_RESOURCES = Object.freeze([
  'authorization',
  'obo_clients',
  'obo_forms',
  'obo_permit_types',
  'obo_plan_permits',
  'obo_professionals',
  'obo_appointments',
])

export const OBO_AUTHORIZATION_MODULE_PREFIX = 'obo_'
const OBO_RESOURCE_SET = new Set(OBO_RESOURCES)

export const assertOBOResource = (resource) => {
  if (!OBO_RESOURCE_SET.has(resource)) {
    throw new TypeError(`Unsupported OBO authorization resource: ${resource}`)
  }
  return resource
}

export const authorizeOBO = (resource, action) => authorize(assertOBOResource(resource), action)

export const authorizeOBOResource = ({ resource, action, loadResource, getResourceId, policy }) => authorizeResource({
  resource: assertOBOResource(resource),
  action,
  loadResource,
  getResourceId,
  policy,
})

export const listAuthorizationModules = () => management.listModules()
export const getAuthorizationModule = (moduleId) => management.getModule(moduleId)
export const createAuthorizationModule = ({ key, name, description }) => management.createModule({ key, name, description })
export const addAuthorizationPermission = ({ moduleId, action }) => management.addPermission({ moduleId, action })
export const setAuthorizationModuleActive = ({ moduleId, isActive }) => management.setModuleActive({ moduleId, isActive })
export const listAuthorizationRoles = (appId) => management.listRoles({ appId })
export const createAuthorizationRole = ({ appId, membershipId, name, description }) => management.createRole({ appId, membershipId, name, description })
export const getAuthorizationRole = ({ roleId, appId }) => management.getRole({ roleId, appId })
export const getAuthorizationMembership = ({ membershipId, appId }) => management.getMembership({ membershipId, appId })
export const replaceAuthorizationRolePermissions = ({ roleId, permissionIds, appId }) => management.replaceRolePermissions({ roleId, permissionIds, appId })
export const listMembershipAuthorizationRoles = ({ membershipId, appId }) => management.listMembershipRoles({ membershipId, appId })
export const replaceMembershipAuthorizationRoles = ({ membershipId, appId, roleIds }) => management.replaceMembershipRoles({ membershipId, appId, roleIds })
