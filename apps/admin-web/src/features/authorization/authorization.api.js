import { apiClient } from '../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const authorizationApi = {
  async getContext() {
    return unwrap(await apiClient.get('/me/authorization'))
  },
  async listModules() {
    return unwrap(await apiClient.get('/authorization/modules'))
  },
  async createModule(payload) {
    return unwrap(await apiClient.post('/authorization/modules', payload))
  },
  async addPermission(moduleId, payload) {
    return unwrap(await apiClient.post(`/authorization/modules/${moduleId}/permissions`, payload))
  },
  async setModuleActive(moduleId, isActive) {
    return unwrap(await apiClient.patch(`/authorization/modules/${moduleId}/active`, { isActive }))
  },
  async listRoles() {
    return unwrap(await apiClient.get('/authorization/roles'))
  },
  async replaceRolePermissions(roleId, permissionIds) {
    return unwrap(await apiClient.put(`/authorization/roles/${roleId}/permissions`, { permissionIds }))
  },
}
