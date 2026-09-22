import { apiClient } from '../../../services/api/client'

export const resourcesApi = {
  listInstruments: () => apiClient.get('/cadenza/instruments'),
  createInstrument: (payload) => apiClient.post('/cadenza/instruments', payload),
  getInstrument: (id) => apiClient.get(`/cadenza/instruments/${id}`),
  listRooms: () => apiClient.get('/cadenza/rooms'),
  createRoom: (payload) => apiClient.post('/cadenza/rooms', payload),
  getRoom: (id) => apiClient.get(`/cadenza/rooms/${id}`),
}
