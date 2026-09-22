import { apiClient } from '../../../services/api/client'

export const rentalsApi = {
  list: (params = {}) => apiClient.get('/api/v1/cadenza/rentals', { params }),
  create: (payload) => apiClient.post('/api/v1/cadenza/rentals', payload),
  recordBalancePayment: (rentalId, payload) => apiClient.post(`/api/v1/cadenza/rentals/${rentalId}/payments`, payload),
}
