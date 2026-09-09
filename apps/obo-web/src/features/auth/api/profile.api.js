import { apiClient } from '../../../services/api/client'

const normalizeProfile = (response) => {
  const data = response.data?.data
  if (!data) return null

  return {
    ...(data.person ?? {}),
    email: data.user?.email ?? '',
    user: data.user ?? null,
  }
}

export const profileApi = {
  async get() {
    try {
      const response = await apiClient.get('/users/me/profile')
      return normalizeProfile(response)
    } catch (error) {
      if (error.status === 404) return null
      throw error
    }
  },

  async create(profile) {
    const response = await apiClient.post('/users/me/profile', profile)
    return normalizeProfile(response)
  },

  async update(profile) {
    const response = await apiClient.patch('/users/me/profile', profile)
    return normalizeProfile(response)
  },
}
