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
    return unwrap(await apiClient.get('/obo/professionals/mine'))
  },

  async applyVerification(data) {
    return unwrap(await apiClient.post('/obo/professionals', data))
  },

  async decideVerification(id, decision, reason) {
    return unwrap(await apiClient.post(`/obo/professionals/${encodeId(id)}/verification`, {
      decision,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }))
  },
}
