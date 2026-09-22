import { apiClient } from '../../../services/api/client'

export const lessonsApi = {
  listPackages: () => apiClient.get('/api/v1/cadenza/lesson-packages'),
  createPackage: (payload) => apiClient.post('/api/v1/cadenza/lesson-packages', payload),
  enroll: (payload) => apiClient.post('/api/v1/cadenza/lesson-enrollments', payload),
}
