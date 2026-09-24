import { apiClient } from '../../../services/api/client'

export const staffApi = {
  list: () => apiClient.get('/cadenza/staff'),
  get: (id) => apiClient.get('/cadenza/staff/' + id),
  create: (payload) => apiClient.post('/cadenza/staff', payload),
  update: (id, payload) => apiClient.patch('/cadenza/staff/' + id, payload),
}
