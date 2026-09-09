import { apiClient } from '../../../services/api/client'

export const profileApi = {
  async get() {
    const response = await apiClient.get('/auth/me/profile')
    return response.data?.profile ?? null
  },

  async update(profile) {
    const response = await apiClient.patch('/auth/me/profile', profile)
    return response.data?.profile ?? null
  },
}
