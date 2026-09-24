import { apiClient } from '../../../services/api/client'

export const actorsApi = {
  list: (params = {}) => apiClient.get('/cadenza/actors', { params }),
  get: (userId) => apiClient.get('/cadenza/actors/' + userId),
}
