import { apiClient } from '@/core/api/apiClient';

export async function getAuditLogs(params = {}) {
  const response = await apiClient.get('/audit', {
    params: { ...params, _auditRefresh: Date.now() },
  });
  // apiClient returns the API envelope directly: { success, data, pagination }.
  // Keep this tolerant of clients that wrap it in a `data` property as well.
  const payload = response?.success ? response : response?.data?.success ? response.data : response;
  return {
    items: Array.isArray(payload?.data) ? payload.data : [],
    pagination: payload?.pagination ?? null,
  };
}
