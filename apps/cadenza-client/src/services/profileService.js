import { apiClient } from '@/core/api/apiClient';

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

export const getMyProfile = async () =>
  unwrap(await apiClient.get('/users/me/profile'));

export const updateMyProfile = async (data) =>
  unwrap(await apiClient.patch('/users/me/profile', data));

export const updateMyPassword = async (currentPassword, password) =>
  unwrap(await apiClient.put('/users/me/password', { currentPassword, password }));
