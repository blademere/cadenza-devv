import { apiClient } from '../../../services/api/client'

export const rentalsApi = {
  list: () => apiClient.get('/cadenza/rentals'),
  create: (payload) => apiClient.post('/cadenza/rentals', payload),
  recordBalancePayment: (rentalId, payload) => apiClient.post(`/cadenza/rentals/${rentalId}/payments`, payload),
}
