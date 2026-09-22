import { apiClient } from '../../../services/api/client'

export const instructorsApi = {
  list: () => apiClient.get('/cadenza/instructors'),
  create: (payload) => apiClient.post('/cadenza/instructors', payload),
}
