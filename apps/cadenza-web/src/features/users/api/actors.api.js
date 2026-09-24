import { apiClient } from '../../../services/api/client'

export const actorsApi = {
  list: ({ page, limit, search } = {}) => {
    const query = new URLSearchParams()
    if (page) query.set('page', page)
    if (limit) query.set('limit', limit)
    if (search) query.set('search', search)
    const suffix = query.toString() ? '?' + query.toString() : ''
    return apiClient.get('/cadenza/actors' + suffix)
  },
  get: (userId) => apiClient.get('/cadenza/actors/' + userId),
}
