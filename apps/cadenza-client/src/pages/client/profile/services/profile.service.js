import { apiClient } from '@/core/api/apiClient';

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

export async function getMyProfile() {
  const response = await apiClient.get('/users/me/profile');
  return unwrap(response);
}

export async function updateMyProfile(data) {
  const response = await apiClient.patch('/users/me/profile', data);
  return unwrap(response);
}

export async function updateMyPassword(currentPassword, password) {
  const body = { password };
  if (currentPassword?.trim()) body.currentPassword = currentPassword;
  const response = await apiClient.put('/users/me/password', {
    ...body,
  });
  return unwrap(response);
}
