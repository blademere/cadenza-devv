import { apiClient } from '../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const workflowApi = {
  async listReceiving(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return unwrap(await apiClient.get(`/obo/receiving/applications${query}`))
  },
  async receiveApplication(id) {
    return unwrap(await apiClient.post(`/obo/receiving/applications/${id}/receive`, {}))
  },
  async decideApplication(id, decision, reason) {
    return unwrap(await apiClient.post(`/obo/receiving/applications/${id}/decision`, { decision, reason }))
  },
  async listPendingProfessionals() {
    return unwrap(await apiClient.get('/obo/professionals/pending'))
  },
  async decideProfessional(id, decision, reason) {
    return unwrap(await apiClient.post(`/obo/professionals/${id}/verification`, { decision, reason }))
  },
}
