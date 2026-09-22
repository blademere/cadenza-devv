import { apiClient } from '../../../services/api/client'

export const lessonsApi = {
  listPackages: () => apiClient.get('/cadenza/lessons/packages'),
  createPackage: (payload) => apiClient.post('/cadenza/lessons/packages', payload),
  addAttachment: (lessonPackageId, payload) => apiClient.post(`/cadenza/lessons/packages/${lessonPackageId}/attachments`, payload),
  listAttachments: (lessonPackageId) => apiClient.get(`/cadenza/lessons/packages/${lessonPackageId}/attachments`),
  deleteAttachment: (lessonPackageId, id) => apiClient.delete(`/cadenza/lessons/packages/${lessonPackageId}/attachments/${id}`),
  getAttachmentUrl: (lessonPackageId, id) => apiClient.get(`/cadenza/lessons/packages/${lessonPackageId}/attachments/${id}/url`),
  listEnrollments: () => apiClient.get('/cadenza/lessons/enrollments'),
  enroll: (payload) => apiClient.post('/cadenza/lessons/enrollments', payload),
}
