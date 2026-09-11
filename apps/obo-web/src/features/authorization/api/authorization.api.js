import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const authorizationApi = {
  async getContext() {
    // Authorization is security-sensitive and must never be satisfied by a
    // browser/proxy-cached GET response after role permissions change.
    return unwrap(await apiClient.get('/me/authorization', { cache: 'no-store' }))
  },
  async listModules() {
    return unwrap(await apiClient.get('/admin/authorization/modules', { cache: 'no-store' }))
  },
  async createModule(payload) {
    return unwrap(await apiClient.post('/admin/authorization/modules', payload))
  },
  async addPermission(moduleId, payload) {
    return unwrap(await apiClient.post(`/admin/authorization/modules/${moduleId}/permissions`, payload))
  },
  async setModuleActive(moduleId, isActive) {
    return unwrap(await apiClient.patch(`/admin/authorization/modules/${moduleId}/active`, { isActive }))
  },
  async listRoles() {
    return unwrap(await apiClient.get('/admin/authorization/roles', { cache: 'no-store' }))
  },
  async replaceRolePermissions(roleId, permissionIds) {
    return unwrap(await apiClient.put(`/admin/authorization/roles/${roleId}/permissions`, { permissionIds }))
  },
}
