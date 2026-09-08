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

export const appointmentsApi = {
  async listTypes() {
    return unwrap(await apiClient.get('/appointments/types?active=true'))
  },

  async listSlots({ appointmentTypeId, from, to, status = 'OPEN' } = {}) {
    return unwrap(await apiClient.get(`/appointments/slots${buildQuery({ appointmentTypeId, from, to, status })}`))
  },

  async createSlot(data) {
    return unwrap(await apiClient.post('/appointments/slots', data))
  },
}
