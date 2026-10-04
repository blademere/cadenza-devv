import { apiClient } from '@/core/api/apiClient';

export const authService = {
  async login({ email, password }) {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    const authData = response?.data;

    if (!authData?.accessToken) {
      throw new Error('Login response did not contain an access token.');
    }

    apiClient.setAccessToken(authData.accessToken);
    localStorage.setItem('accessToken', authData.accessToken);

    if (authData.csrfToken) {
      apiClient.setCsrfToken(authData.csrfToken);
      localStorage.setItem('csrfToken', authData.csrfToken);
    }

    return authData;
  },

  async me() {
    return apiClient.get('/auth/me');
  },

  async refresh() {
    try {
      const response = await apiClient.post('/auth/refresh', {});

      const authData = response?.data;

      if (!authData?.accessToken) {
        throw new Error('Refresh response did not contain an access token.');
      }

      apiClient.setAccessToken(authData.accessToken);
      localStorage.setItem('accessToken', authData.accessToken);

      if (authData.csrfToken) {
        apiClient.setCsrfToken(authData.csrfToken);
        localStorage.setItem('csrfToken', authData.csrfToken);
      } else {
        apiClient.setCsrfToken(null);
        localStorage.removeItem('csrfToken');
      }

      return true;
    } catch {
      apiClient.clearAccessToken();
      apiClient.setCsrfToken(null);

      localStorage.removeItem('accessToken');
      localStorage.removeItem('csrfToken');

      return false;
    }
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      apiClient.clearAccessToken();
      apiClient.setCsrfToken(null);

      localStorage.removeItem('accessToken');
      localStorage.removeItem('csrfToken');
    }
  },
};

export async function getStaff({ status = 'ALL', staffType = 'ALL' } = {}) {
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
}

export async function createStaffAccount(data) {
  const response = await apiClient.post('/staff/accounts', data);

  return response?.data ?? null;
}

export async function updateStaff(id, data) {
  const response = await apiClient.patch(`/staff/${id}`, data);

  return response?.data ?? null;
}

export async function deactivateStaff(id) {
  const response = await apiClient.patch(`/staff/${id}/deactivate`);

  return response?.data ?? null;
}
