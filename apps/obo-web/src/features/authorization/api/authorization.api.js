import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response
const basePath = '/obo/authorization'

export const authorizationApi = {
  async getContext() {
    return unwrap(await apiClient.get('/me/authorization', { cache: 'no-store' }))
  },
  async listModules() {
    return unwrap(await apiClient.get(`${basePath}/modules`, { cache: 'no-store' }))
  },
  async createModule(payload) {
    return unwrap(await apiClient.post(`${basePath}/modules`, payload))
  },
  async addPermission(moduleId, payload) {
    return unwrap(await apiClient.post(`${basePath}/modules/${moduleId}/permissions`, payload))
  },
  async setModuleActive(moduleId, isActive) {
    return unwrap(await apiClient.patch(`${basePath}/modules/${moduleId}/active`, { isActive }))
  },
  async listRoles() {
    return unwrap(await apiClient.get(`${basePath}/roles`, { cache: 'no-store' }))
  },
  async createRole(payload) {
    return unwrap(await apiClient.post(`${basePath}/roles`, payload))
  },
  async getRole(roleId) {
    return unwrap(await apiClient.get(`${basePath}/roles/${roleId}`))
  },
  async replaceRolePermissions(roleId, permissionIds) {
    return unwrap(await apiClient.put(`${basePath}/roles/${roleId}/permissions`, { permissionIds }))
  },
  async listMembershipRoles(membershipId) {
    return unwrap(await apiClient.get(`${basePath}/memberships/${membershipId}/roles`))
  },
  async replaceMembershipRoles(membershipId, roleIds) {
    return unwrap(await apiClient.put(`${basePath}/memberships/${membershipId}/roles`, { roleIds }))
  },
}
