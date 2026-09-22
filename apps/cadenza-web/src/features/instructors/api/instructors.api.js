import { apiClient } from '../../../services/api/client'

export const instructorsApi = {
  list: () => apiClient.get('/cadenza/instructors'),
  update: (id, payload) => apiClient.patch(`/cadenza/instructors/${id}`, payload),
  create: (payload) => apiClient.post('/cadenza/instructors', payload),
}
