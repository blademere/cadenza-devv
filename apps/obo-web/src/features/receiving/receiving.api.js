import { apiClient } from '../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const receivingApi = {
  async listApplications(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return unwrap(await apiClient.get(`/obo/receiving/applications${query}`))
  },

  async receiveApplication(id) {
    return unwrap(await apiClient.post(`/obo/receiving/applications/${id}/receive`, {}))
  },

  async decideApplication(id, decision, reason) {
    return unwrap(await apiClient.post(`/obo/receiving/applications/${id}/decision`, { decision, reason }))
  },
}
