import { apiClient } from '../../../services/api/client'

const unwrapProfile = (response) => response.data?.data ?? null

export const profileApi = {
  async get() {
    const response = await apiClient.get('/users/me/profile')
    return unwrapProfile(response)
  },

  async update(profile) {
    const response = await apiClient.patch('/users/me/profile', profile)
    return unwrapProfile(response)
  },
}
