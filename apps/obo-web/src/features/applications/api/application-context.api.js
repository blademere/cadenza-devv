import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const applicationsApi = {
  async list() {
    return unwrap(await apiClient.get('/apps', { cache: 'no-store' }))
  },
  async get(appKey) {
    return unwrap(await apiClient.get(`/apps/${encodeURIComponent(appKey)}`, { cache: 'no-store' }))
  },
  async select(appKey) {
    return unwrap(await apiClient.post(`/apps/${encodeURIComponent(appKey)}/select`, {}))
  },
}
