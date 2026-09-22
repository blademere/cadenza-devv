import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const authorizationApi = {
  async getContext() {
    return unwrap(await apiClient.get('/me/authorization', { cache: 'no-store' }))
  },
}
