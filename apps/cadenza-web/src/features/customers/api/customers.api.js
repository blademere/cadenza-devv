import { apiClient } from '../../../services/api/client'

export const customersApi = {
  list: () => apiClient.get('/cadenza/customers'),
  registerMe: () => apiClient.post('/cadenza/customers/me'),
  update: (id, payload) => apiClient.patch(`/cadenza/customers/${id}`, payload),
  create: (payload) => apiClient.post('/cadenza/customers', payload),
}
