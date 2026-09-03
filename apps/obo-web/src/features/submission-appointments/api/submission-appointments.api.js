import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const submissionAppointmentsApi = {
  async getApplicationAppointment(applicationId) {
    return unwrap(await apiClient.get(`/obo/applications/${encodeURIComponent(applicationId)}/submission-appointments`))
  },

  async createApplicationAppointment(applicationId, data) {
    return unwrap(await apiClient.post(`/obo/applications/${encodeURIComponent(applicationId)}/submission-appointments`, data))
  },
}
