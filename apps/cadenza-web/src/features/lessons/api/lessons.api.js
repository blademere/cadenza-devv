import { apiClient } from '../../../services/api/client'

export const lessonsApi = {
  listPackages: () => apiClient.get('/cadenza/lessons/packages'),
  createPackage: (payload) => apiClient.post('/cadenza/lessons/packages', payload),
  listEnrollments: () => apiClient.get('/cadenza/lessons/enrollments'),
  enroll: (payload) => apiClient.post('/cadenza/lessons/enrollments', payload),
  listAttachments: (lessonPackageId) => apiClient.get(`/cadenza/lessons/packages/${lessonPackageId}/attachments`),
}
