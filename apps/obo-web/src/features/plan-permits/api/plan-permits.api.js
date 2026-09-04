import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const planPermitsApi = {
  async listApplications() {
    return unwrap(await apiClient.get('/obo/applications/mine'))
  },

  async getApplication(id) {
    return unwrap(await apiClient.get(`/obo/applications/${encodeURIComponent(id)}`))
  },

  async listPermitTypes() {
    return unwrap(await apiClient.get('/obo/permit-types'))
  },

  async getPermitTypeForm(id) {
    return unwrap(await apiClient.get(`/obo/permit-types/${encodeURIComponent(id)}/form`))
  },
}
