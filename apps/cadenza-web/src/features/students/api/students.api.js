import { apiClient } from '../../../services/api/client'

export const studentsApi = {
  list: () => apiClient.get('/cadenza/students'),
  registerMe: () => apiClient.post('/cadenza/students/me'),
  update: (id, payload) => apiClient.patch(`/cadenza/students/${id}`, payload),
  create: (payload) => apiClient.post('/cadenza/students', payload),
}
