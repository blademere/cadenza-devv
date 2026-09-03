import { apiClient } from '../../services/api/client'

const unwrap = (response) => response?.data ?? response

export const professionalsApi = {
  async listPendingVerification() {
    return unwrap(await apiClient.get('/obo/professionals/pending'))
  },

  async decideVerification(id, decision, reason) {
    return unwrap(await apiClient.post(`/obo/professionals/${id}/verification`, { decision, reason }))
  },
}
