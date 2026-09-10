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

const encodeId = (id) => encodeURIComponent(id)

export const appointmentsApi = {
  async listTypes({ active } = {}) {
    return unwrap(await apiClient.get(`/appointments/types${buildQuery({ active })}`))
  },

  async createType(data) {
    return unwrap(await apiClient.post('/appointments/types', data))
  },

  async listSchedules({ appointmentTypeId, active } = {}) {
    return unwrap(await apiClient.get(`/appointments/schedules${buildQuery({ appointmentTypeId, active })}`))
  },

  async createSchedule(data) {
    return unwrap(await apiClient.post('/appointments/schedules', data))
  },

  async listSlots({ appointmentTypeId, from, to, status } = {}) {
    return unwrap(await apiClient.get(`/appointments/slots${buildQuery({ appointmentTypeId, from, to, status })}`))
  },

  async createSlot(data) {
    return unwrap(await apiClient.post('/appointments/slots', data))
  },

  async generateSlots(data) {
    return unwrap(await apiClient.post('/appointments/slots/generate', data))
  },

  async listManagement({ appointmentTypeId, status, from, to } = {}) {
    return unwrap(await apiClient.get(`/appointments/management${buildQuery({ appointmentTypeId, status, from, to })}`))
  },

  async cancelManagement(id) {
    return unwrap(await apiClient.post(`/appointments/management/${encodeId(id)}/cancel`, {}))
  },

  async listMine() {
    return unwrap(await apiClient.get('/appointments/mine'))
  },

  async get(id) {
    return unwrap(await apiClient.get(`/appointments/${encodeId(id)}`))
  },

  async cancel(id) {
    return unwrap(await apiClient.post(`/appointments/${encodeId(id)}/cancel`, {}))
  },

  async checkIn(id) {
    return unwrap(await apiClient.post(`/appointments/${encodeId(id)}/check-in`, {}))
  },

  async noShow(id) {
    return unwrap(await apiClient.post(`/appointments/${encodeId(id)}/no-show`, {}))
  },

  async complete(id) {
    return unwrap(await apiClient.post(`/appointments/${encodeId(id)}/complete`, {}))
  },
}
