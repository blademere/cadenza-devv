import { apiClient } from '@/core/api/apiClient';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];

export async function getDependents() {
  return unwrap(await apiClient.get('/dependents'));
}

export async function createDependent(data) {
  return unwrap(await apiClient.post('/dependents', data));
}

export async function updateDependent(id, data) {
  return unwrap(await apiClient.patch(`/dependents/${id}`, data));
}

export async function resetDependentPassword(id, password) {
  return unwrap(await apiClient.post(`/dependents/${id}/password`, { password }));
}
