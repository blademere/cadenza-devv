import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const receivingApi = {
  async listApplications(status = 'SUBMISSION_SCHEDULED') {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return unwrap(await apiClient.get(`/obo/receiving/applications${query}`))
  },

  async receiveApplication(applicationId) {
    return unwrap(await apiClient.post(`/obo/receiving/applications/${encodeURIComponent(applicationId)}/receive`, {}))
  },

  async decideApplication(applicationId, data) {
    return unwrap(await apiClient.post(`/obo/receiving/applications/${encodeURIComponent(applicationId)}/decision`, data))
  },
}
