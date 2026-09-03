import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response

const buildQuery = (params = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const submissionAppointmentsApi = {
  async getApplicationAppointment(applicationId) {
    return unwrap(await apiClient.get(`/obo/applications/${encodeURIComponent(applicationId)}/submission-appointments`))
  },

  async createApplicationAppointment(applicationId, data) {
    return unwrap(await apiClient.post(`/obo/applications/${encodeURIComponent(applicationId)}/submission-appointments`, data))
  },

  async listMyAppointments() {
    return unwrap(await apiClient.get('/appointments/mine'))
  },

  async listAppointmentTypes() {
    return unwrap(await apiClient.get('/appointments/types?active=true'))
  },

  async listAvailableSlots({ appointmentTypeId, from, to } = {}) {
    return unwrap(await apiClient.get(`/appointments/slots${buildQuery({ appointmentTypeId, from, to, status: 'OPEN' })}`))
  },
}
