import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response
const encodeId = (id) => encodeURIComponent(id)

export const professionalsApi = {
  async getProfile() {
    return unwrap(await apiClient.get('/obo/professionals/profile'))
  },

  async createProfile(data) {
    return unwrap(await apiClient.post('/obo/professionals/profile', data))
  },

  async updateProfile(data) {
    return unwrap(await apiClient.patch('/obo/professionals/profile', data))
  },

  async getApplication() {
    try {
      return unwrap(await apiClient.get('/obo/professionals/applications/mine'))
    } catch (error) {
      if (error?.status === 404) return null
      throw error
    }
  },

  async applyVerification(data) {
    return unwrap(await apiClient.post('/obo/professionals/applications', data))
  },

  async listVerified() {
    return unwrap(await apiClient.get('/obo/professionals/applications/verified'))
  },

  async listPendingVerification() {
    return unwrap(await apiClient.get('/obo/professionals/applications/pending'))
  },

  async decideVerification(id, decision, reason) {
    return unwrap(await apiClient.post(`/obo/professionals/applications/${encodeId(id)}/decision`, {
      decision,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }))
  },
}
