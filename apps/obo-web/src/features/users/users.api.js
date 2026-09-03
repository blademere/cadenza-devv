import { apiClient } from '../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const usersApi = {
  async listUsers() {
    return unwrap(await apiClient.get('/users?limit=100'))
  },
  async assignRole(userId, roleId) {
    return unwrap(await apiClient.patch(`/users/${userId}/role`, { roleId }))
  },
}
