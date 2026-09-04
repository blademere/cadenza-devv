import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const receivingApi = {
  async listApplications(status) {
    if (status !== undefined && typeof status !== 'string') {
      throw new TypeError('Receiving application status must be a string')
    }

    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return unwrap(await apiClient.get(`/obo/receiving/applications${query}`))
  },
  async getApplication(id) {
    return unwrap(await apiClient.get(`/obo/receiving/applications/${encodeURIComponent(id)}`))
  },
  async receiveApplication(id) {
    return unwrap(await apiClient.post(`/obo/receiving/applications/${encodeURIComponent(id)}/receive`, {}))
  },
  async decideApplication(id, decision, reason) {
    return unwrap(await apiClient.post(`/obo/receiving/applications/${encodeURIComponent(id)}/decision`, { decision, ...(reason?.trim() ? { reason: reason.trim() } : {}) }))
  },
}
