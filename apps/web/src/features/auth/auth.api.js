import { apiClient } from '../../services/api/client'

const AUTH_PATH = '/auth'

export const authApi = {
  async login(credentials) {
    const response = await apiClient.post(`${AUTH_PATH}/login`, credentials)
    return response.data
  },

  async refresh() {
    const response = await apiClient.post(`${AUTH_PATH}/refresh`)
    return response.data
  },

  async me() {
    const response = await apiClient.get(`${AUTH_PATH}/me`)
    return response.data
  },

  async logout() {
    await apiClient.post(`${AUTH_PATH}/logout`)
  },
}
