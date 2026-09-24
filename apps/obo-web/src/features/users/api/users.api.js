import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response
const encodeId = (id) => encodeURIComponent(id)

export const usersApi = {
  async listUsers() {
    return unwrap(await apiClient.get('/obo/users?limit=100'))
  },

  async assignRole(userId, roleId) {
    return unwrap(
      await apiClient.post(`/obo/users/${encodeId(userId)}/roles`, { roleId })
    )
  },

  async getMyProfile() {
    return unwrap(await apiClient.get('/users/me/profile'))
  },

  async createMyProfile(data) {
    return unwrap(await apiClient.post('/users/me/profile', data))
  },

  async updateMyProfile(data) {
    return unwrap(await apiClient.patch('/users/me/profile', data))
  },
}
