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

  async getPermitType(id) {
    return unwrap(await apiClient.get(`/obo/permit-types/${encodeId(id)}`))
  },

  async getPermitTypeFormVersions(id) {
    return unwrap(await apiClient.get(`/obo/permit-types/${encodeId(id)}/form/versions`))
  },

  async getPermitTypeForm(id, version) {
    const query = version == null ? '' : `?version=${encodeURIComponent(version)}`
    return unwrap(await apiClient.get(`/obo/permit-types/${encodeId(id)}/form${query}`))
  },

  async getPermitTypeFormVersion(id, version) {
    return unwrap(await apiClient.get(`/obo/permit-types/${encodeId(id)}/form/versions/${encodeURIComponent(version)}`))
  },

  async createPermitType(data) {
    return unwrap(await apiClient.post('/obo/permit-types', data))
  },

  async updatePermitType(id, data) {
    return unwrap(await apiClient.patch(`/obo/permit-types/${encodeId(id)}`, data))
  },

  async createPermitTypeForm(id, data) {
    return unwrap(await apiClient.post(`/obo/permit-types/${encodeId(id)}/form`, data))
  },

  async createPermitTypeFormVersion(id, data) {
    return unwrap(await apiClient.post(`/obo/permit-types/${encodeId(id)}/form/versions`, data))
  },

  async updatePermitTypeFormVersion(id, version, data) {
    return unwrap(await apiClient.patch(`/obo/permit-types/${encodeId(id)}/form/versions/${encodeURIComponent(version)}`, data))
  },

  async publishPermitTypeFormVersion(id, version) {
    return unwrap(await apiClient.post(`/obo/permit-types/${encodeId(id)}/form/versions/${encodeURIComponent(version)}/publish`, {}))
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
