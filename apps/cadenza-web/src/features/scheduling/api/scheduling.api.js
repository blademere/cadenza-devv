import { apiClient } from '../../../services/api/client'

export const schedulingApi = {
  listSessions: (params = {}) => apiClient.get('/api/v1/cadenza/lesson-sessions', { params }),
  assignInstructor: (sessionId, instructorId) => apiClient.patch(`/api/v1/cadenza/lesson-sessions/${sessionId}`, { instructorId }),
  markAttendance: (sessionId, status) => apiClient.post(`/api/v1/cadenza/lesson-sessions/${sessionId}/attendance`, { status }),
  requestReschedule: (sessionId, reason) => apiClient.post(`/api/v1/cadenza/lesson-sessions/${sessionId}/reschedule-requests`, { reason }),
}
