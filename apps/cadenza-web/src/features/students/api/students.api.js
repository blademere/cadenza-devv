import { apiClient } from '../../../services/api/client'

export const studentsApi = {
  list: () => apiClient.get('/cadenza/students'),
  create: (payload) => apiClient.post('/cadenza/students', payload),
}
