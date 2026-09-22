import { apiClient } from '../../../services/api/client'

export const paymentsApi = {
  get: (obligationId) => apiClient.get(`/cadenza/payments/${obligationId}`),
  pay: (obligationId, payload) => apiClient.post(`/cadenza/payments/${obligationId}/pay`, payload),
  checkout: (obligationId, payload) => apiClient.post(`/cadenza/payments/${obligationId}/checkout`, payload),
}
