import { apiClient } from '../../../services/api/client';

export const instructorsApi = {
  list: () => apiClient.get('/cadenza/instructors'),
  listCandidates: () => apiClient.get('/cadenza/instructors/candidates'),
  get: (id) => apiClient.get(`/cadenza/instructors/${id}`),
  update: (id, payload) =>
    apiClient.patch(`/cadenza/instructors/${id}`, payload),
  create: (payload) => apiClient.post('/cadenza/instructors', payload),
  getAvailability: (id) =>
    apiClient.get(`/cadenza/instructors/${id}/availability`),
  replaceAvailability: (id, payload) =>
    apiClient.put(`/cadenza/instructors/${id}/availability`, payload),
  addAvailabilityBlock: (id, payload) =>
    apiClient.post(`/cadenza/instructors/${id}/availability/blocks`, payload),
  removeAvailabilityBlock: (id, blockId) =>
    apiClient.delete(
      `/cadenza/instructors/${id}/availability/blocks/${blockId}`,
    ),
};
