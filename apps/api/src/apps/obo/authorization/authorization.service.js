import * as management from './authorization-management.service.js'

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
