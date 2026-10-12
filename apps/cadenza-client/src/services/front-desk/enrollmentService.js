import { apiClient } from '@/core/api/apiClient';

export const enrollmentService = {
  async getEnrollments(params = {}) {
    const response = await apiClient.get('/enrollments', { params });

    return response.data?.data ?? response.data ?? [];
  },

  async approveEnrollment(enrollmentId) {
    const response = await apiClient.patch(
      `/enrollments/${enrollmentId}/approve`,
    );

    return response.data?.data ?? response.data;
  },

  async cancelEnrollment(enrollmentId) {
    const response = await apiClient.patch(
      `/enrollments/${enrollmentId}/cancel-by-staff`,
    );

    return response.data?.data ?? response.data;
  },
};
