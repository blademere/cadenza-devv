import { apiClient } from '../../../services/api/client'

export const lessonsApi = {
  listPackages: () => apiClient.get('/cadenza/lesson-packages'),
  createPackage: (payload) => apiClient.post('/cadenza/lesson-packages', payload),
  enroll: (payload) => apiClient.post('/cadenza/lesson-enrollments', payload),
}
