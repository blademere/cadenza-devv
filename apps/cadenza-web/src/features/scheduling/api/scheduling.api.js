import { apiClient } from '../../../services/api/client'

export const schedulingApi = {
  listSessions: () => apiClient.get('/cadenza/lessons/sessions'),
  createSession: (payload) => apiClient.post('/cadenza/lessons/sessions', payload),
  markAttendance: (sessionId, payload) => apiClient.post(`/cadenza/lessons/sessions/${sessionId}/attendance`, payload),
  completeSession: (sessionId) => apiClient.post(`/cadenza/lessons/sessions/${sessionId}/complete`),
  cancelSession: (sessionId) => apiClient.post(`/cadenza/lessons/sessions/${sessionId}/cancel`),
  listReschedules: () => apiClient.get('/cadenza/lessons/reschedules'),
  requestReschedule: (payload) => apiClient.post('/cadenza/lessons/reschedules', payload),
  reviewReschedule: (rescheduleId, approve) => apiClient.post(`/cadenza/lessons/reschedules/${rescheduleId}/review`, { approve }),
}
