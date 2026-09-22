import { apiClient } from '../../../services/api/client'

export const studentsApi = {
  list: () => apiClient.get('/cadenza/students'),
  registerMe: () => apiClient.post('/cadenza/students/me'),
  create: (payload) => apiClient.post('/cadenza/students', payload),
}
