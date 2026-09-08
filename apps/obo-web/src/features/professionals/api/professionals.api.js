import { apiClient } from '../../../services/api/client'

const unwrap = (response) => response?.data ?? response
const encodeId = (id) => encodeURIComponent(id)

export const professionalsApi = {
  async listVerified() {
    return unwrap(await apiClient.get('/obo/professionals/verified'))
  },

  async listPendingVerification() {
    return unwrap(await apiClient.get('/obo/professionals/pending'))
  },

  async getMine() {
    try {
      return unwrap(await apiClient.get('/obo/professionals/mine'))
    } catch (error) {
      if (error?.status === 404) return null
      throw error
    }
  },

  async applyVerification(data) {
    return unwrap(await apiClient.post('/obo/professionals/profile', data))
  },

  async decideVerification(id, decision, reason) {
    return unwrap(await apiClient.post(`/obo/professionals/${encodeId(id)}/verification`, {
      decision,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }))
  },
}
