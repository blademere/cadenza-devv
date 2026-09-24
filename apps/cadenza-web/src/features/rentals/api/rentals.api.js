import { apiClient } from '../../../services/api/client'

export const rentalsApi = {
  customers: () => apiClient.get('/cadenza/customers'),
  availability: (params) => apiClient.get(`/cadenza/rentals/availability?${new URLSearchParams(params).toString()}`),
  list: () => apiClient.get('/cadenza/rentals'),
  get: (rentalId) => apiClient.get(`/cadenza/rentals/${rentalId}`),
  create: (payload) => apiClient.post('/cadenza/rentals', payload),
  checkout: (rentalId) => apiClient.post(`/cadenza/rentals/${rentalId}/checkout`),
  returnRental: (rentalId) => apiClient.post(`/cadenza/rentals/${rentalId}/return`),
  cancel: (rentalId) => apiClient.post(`/cadenza/rentals/${rentalId}/cancel`),
}
