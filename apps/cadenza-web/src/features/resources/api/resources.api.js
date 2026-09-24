import { apiClient } from '../../../services/api/client'

export const resourcesApi = {
  listInstruments: () => apiClient.get('/cadenza/instruments'),
  createResource: (payload) => apiClient.post('/cadenza/resources', payload),
  createInstrument: (payload) => apiClient.post('/cadenza/instruments', payload),
  updateInstrument: (id, payload) => apiClient.patch(`/cadenza/instruments/${id}`, payload),
  getInstrument: (id) => apiClient.get(`/cadenza/instruments/${id}`),
  listRooms: () => apiClient.get('/cadenza/rooms'),
  createRoom: (payload) => apiClient.post('/cadenza/rooms', payload),
  updateRoom: (id, payload) => apiClient.patch(`/cadenza/rooms/${id}`, payload),
  getRoom: (id) => apiClient.get(`/cadenza/rooms/${id}`),
  getUsage: (resourceId) => apiClient.get(`/cadenza/resources/${resourceId}/usage`),
  getAudit: () => apiClient.get('/audit?entityType=Resource&page=1&limit=100&sortBy=createdAt&sortOrder=desc'),
}