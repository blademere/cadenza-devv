import { apiClient } from '../../../services/api/client'

export const resourcesApi = {
  list: (params = {}) => apiClient.get('/api/v1/cadenza/resources', { params }),
  create: (payload) => apiClient.post('/api/v1/cadenza/resources', payload),
  update: (resourceId, payload) => apiClient.patch(`/api/v1/cadenza/resources/${resourceId}`, payload),
}
