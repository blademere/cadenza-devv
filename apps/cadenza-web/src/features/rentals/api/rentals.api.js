import { apiClient } from '../../../services/api/client'

export const rentalsApi = {
  availability: (params) => apiClient.get('/cadenza/rentals/availability', { params }),
  list: () => apiClient.get('/cadenza/rentals'),
  create: (payload) => apiClient.post('/cadenza/rentals', payload),
  checkout: (rentalId) => apiClient.post(`/cadenza/rentals/${rentalId}/checkout`),
  returnRental: (rentalId) => apiClient.post(`/cadenza/rentals/${rentalId}/return`),
  cancel: (rentalId) => apiClient.post(`/cadenza/rentals/${rentalId}/cancel`),
}
