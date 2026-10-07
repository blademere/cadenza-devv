import { apiClient } from '@/core/api/apiClient';

export const enrollmentService = {
  async getEnrollments(params = {}) {
    const response = await apiClient.get('/enrollments', { params });

    return response.data?.data ?? response.data ?? [];
  },
};
