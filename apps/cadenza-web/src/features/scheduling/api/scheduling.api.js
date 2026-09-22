import { apiClient } from '../../../services/api/client'

export const schedulingApi = {
  listSessions: () => apiClient.get('/cadenza/lesson-sessions'),
  assignInstructor: (sessionId, instructorId) => apiClient.patch(`/cadenza/lesson-sessions/${sessionId}`, { instructorId }),
  markAttendance: (sessionId, status) => apiClient.post(`/cadenza/lesson-sessions/${sessionId}/attendance`, { status }),
  requestReschedule: (sessionId, reason) => apiClient.post(`/cadenza/lesson-sessions/${sessionId}/reschedule-requests`, { reason }),
}
