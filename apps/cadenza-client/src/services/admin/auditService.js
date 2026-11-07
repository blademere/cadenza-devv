import { apiClient } from '@/core/api/apiClient';

export async function getAuditLogs(params = {}) {
  const response = await apiClient.get('/audit', {
    params: { ...params, _auditRefresh: Date.now() },
  });
  const payload = response?.success ? response : response?.data?.success ? response.data : response;
  return {
    items: Array.isArray(payload?.data) ? payload.data : [],
    pagination: payload?.pagination ?? null,
  };
}
