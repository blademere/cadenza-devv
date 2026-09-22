import { apiClient } from '../../../services/api/client'

export const resourcesApi = {
  list: () => apiClient.get('/cadenza/resources'),
  create: (payload) => apiClient.post('/cadenza/resources', payload),
  update: (resourceId, payload) => apiClient.patch(`/cadenza/resources/${resourceId}`, payload),
}
