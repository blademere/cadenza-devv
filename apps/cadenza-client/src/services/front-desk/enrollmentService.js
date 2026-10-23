import { apiClient } from '@/core/api/apiClient';

export const enrollmentService = {
  async getEnrollments(params = {}) {
    const response = await apiClient.get('/enrollments', { params });
    const payload = response.data;

    if (Array.isArray(payload?.data)) {
      return {
        items: payload.data,
        pagination: payload.pagination || null,
      };
    }

    if (Array.isArray(payload?.items)) {
      return payload;
    }

    return {
      items: Array.isArray(payload) ? payload : [],
      pagination: null,
    };
  },

  async getRefundQuote(enrollmentId) {
    const response = await apiClient.get(`/billing/payments/enrollments/${enrollmentId}/refund`);
    return response.data?.data ?? response.data;
  },

  async recordRefund(enrollmentId, data) {
    const response = await apiClient.post(`/billing/payments/enrollments/${enrollmentId}/refund`, data);
    return response.data?.data ?? response.data;
  },

  async approveEnrollment(enrollmentId) {
    const response = await apiClient.patch(
      `/enrollments/${enrollmentId}/approve`,
    );

    return response.data?.data ?? response.data;
  },

  async cancelEnrollment(enrollmentId, reason) {
    const response = await apiClient.patch(
      `/enrollments/${enrollmentId}/cancel-by-staff`,
      { reason },
    );

    return response.data?.data ?? response.data;
  },
};
