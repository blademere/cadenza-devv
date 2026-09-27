import { apiClient } from '@/core/api/apiClient';
const ADMIN_BASE_URL = '/cadenza-client';
export const createStaffAccount = async (data) => {
  const response = await apiClient.post(
    `${ADMIN_BASE_URL}/staff/accounts`,
    data,
  );
  return response?.data ?? null;
};
export const getStaff = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') {
    params.set('status', filters.status);
  }
  if (filters.staffType && filters.staffType !== 'ALL') {
    params.set('staffType', filters.staffType);
  }
  const queryString = params.toString();
  const response = await apiClient.get(
    `${ADMIN_BASE_URL}/staff${queryString ? `?${queryString}` : ''}`,
  );
  return response?.data ?? [];
};
export const createStaff = async (data) => {
  const response = await apiClient.post(`${ADMIN_BASE_URL}/staff`, data);
  return response?.data ?? null;
};
export const updateStaff = async (id, data) => {
  const response = await apiClient.patch(`${ADMIN_BASE_URL}/staff/${id}`, data);
  return response?.data ?? null;
};
export const deactivateStaff = async (id) => {
  const response = await apiClient.patch(
    `${ADMIN_BASE_URL}/staff/${id}/deactivate`,
    {},
  );
  return response?.data ?? null;
};
