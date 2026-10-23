import { apiClient } from '@/core/api/apiClient';

let refreshPromise = null;

export const getGoogleOAuthUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  return `${apiBaseUrl}/auth/oauth/google`;
};

export const authService = {
  async requestOtp({ email, purpose, password }) {
    const response = await apiClient.post('/auth/otp/request', { email, purpose, ...(purpose === 'login' ? { password } : {}) });
    return response?.data ?? response;
  },

  async verifyOtp({ email, otp, purpose }) {
    const response = await apiClient.post('/auth/otp/verify', { email, otp, purpose });
    const authData = response?.data ?? response;
    apiClient.setAccessToken(authData.accessToken);
    localStorage.setItem('accessToken', authData.accessToken);
    if (authData.csrfToken) {
      apiClient.setCsrfToken(authData.csrfToken);
      localStorage.setItem('csrfToken', authData.csrfToken);
    }
    return authData;
  },

  async login({ email, password }) {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    const authData = response?.data ?? response;

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

  async register(details) {
    const response = await apiClient.post('/auth/register', details);
    return response?.data ?? response;
  },

  async me() {
    return apiClient.get('/auth/me');
  },

  async refresh() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
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
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
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
