import { apiClient } from "@/core/api/apiClient";

const AUTH = "/auth";

export const authService = {
  async csrf() {
    const response = await apiClient.get(`${AUTH}/csrf`);

    const data =
      response?.data?.data ??
      response?.data ??
      response;

    if (data?.csrfToken) {
      apiClient.setCsrfToken(data.csrfToken);
    }

    return response;
  },

  async login(credentials) {
    return apiClient.post(`${AUTH}/login`, credentials, {
      skipRefresh: true,
    });
  },

  async register(details) {
    return apiClient.post(`${AUTH}/register`, details);
  },

  async selectApplication(appKey) {
    return apiClient.post(
      `/apps/${encodeURIComponent(appKey)}/select`,
      undefined,
      {
        skipRefresh: true,
      },
    );
  },

  async refresh() {
    return apiClient.post(`${AUTH}/refresh`, undefined, {
      skipRefresh: true,
    });
  },

  async me() {
    return apiClient.get(`${AUTH}/me`);
  },

  async logout() {
    return apiClient.post(`${AUTH}/logout`, undefined, {
      skipRefresh: true,
    });
  },
};