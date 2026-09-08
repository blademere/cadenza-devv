import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response
const encodeId = (id) => encodeURIComponent(id)

export const planPermitsApi = {
  async listApplications() {
    return unwrap(await apiClient.get('/obo/applications/mine'))
  },

  async getApplication(id) {
    return unwrap(await apiClient.get(`/obo/applications/${encodeId(id)}`))
  },

  async listPermitTypes() {
    return unwrap(await apiClient.get('/obo/permit-types'))
  },

  async getPermitTypeForm(id, version) {
    const query = version == null ? '' : `?version=${encodeURIComponent(version)}`
    return unwrap(await apiClient.get(`/obo/permit-types/${encodeId(id)}/form${query}`))
  },

  async createApplication(data) {
    return unwrap(await apiClient.post('/obo/applications', data))
  },

  async updateDraft(id, data) {
    return unwrap(await apiClient.patch(`/obo/applications/${encodeId(id)}`, data))
  },

  async submitApplication(id) {
    return unwrap(await apiClient.post(`/obo/applications/${encodeId(id)}/submit`, {}))
  },
}
