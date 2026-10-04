import { apiClient } from '@/core/api/apiClient';

export const staffService = {
  async getStaff({ status = 'ALL', staffType = 'ALL' } = {}) {
    const params = new URLSearchParams();

    if (status && status !== 'ALL') {
      params.set('status', status);
    }

    if (staffType && staffType !== 'ALL') {
      params.set('staffType', staffType);
    }

    const query = params.toString();

    const response = await apiClient.get(`/staff${query ? `?${query}` : ''}`);

    return response?.data ?? [];
  },

  async createStaffAccount(data) {
    const response = await apiClient.post('/staff/accounts', data);

    return response?.data ?? null;
  },

  async updateStaff(id, data) {
    const response = await apiClient.patch(`/staff/${id}`, data);

    return response?.data ?? null;
  },

  async deactivateStaff(id) {
    const response = await apiClient.patch(`/staff/${id}/deactivate`);

    return response?.data ?? null;
  },
};
