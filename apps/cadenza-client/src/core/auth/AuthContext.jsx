import { createContext, useCallback, useMemo, useState } from 'react';

import { authService } from '@/pages/auth/services/authService';
import { apiClient } from '@/core/api/apiClient';

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);

    try {
      const response = await authService.login(credentials);

      const authData = response?.data?.data ?? response?.data;

      if (!authData) {
        throw new Error('Login response did not contain authentication data.');
      }

      if (!authData.accessToken) {
        throw new Error('Login response did not contain an access token.');
      }

      // Store authentication state in the API client.
      apiClient.setAccessToken(authData.accessToken);

      if (authData.csrfToken) {
        apiClient.setCsrfToken(authData.csrfToken);
      }

      // Optional persistence.
      localStorage.setItem('accessToken', authData.accessToken);

      if (authData.csrfToken) {
        localStorage.setItem('csrfToken', authData.csrfToken);
      }

      // Select Cadenza Client application.
      const applicationResponse =
        await authService.selectApplication('cadenza-client');

      const applicationData =
        applicationResponse?.data?.data ?? applicationResponse?.data;

      if (applicationData?.accessToken) {
        apiClient.setAccessToken(applicationData.accessToken);

        localStorage.setItem('accessToken', applicationData.accessToken);
      }

      // Get the actual authenticated user.
      const meResponse = await authService.me();

      const currentUser = meResponse?.data?.user ??
        meResponse?.data ??
        authData.user ?? {
          email: credentials.email,
        };

      setUser(currentUser);

      return currentUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (details) => {
    setIsLoading(true);

    try {
      const registeredUser = {
        name: `${details.firstName} ${details.lastName}`,
        email: details.email,
      };

      setUser(registeredUser);

      return registeredUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      apiClient.clearAccessToken();

      localStorage.removeItem('accessToken');
      localStorage.removeItem('csrfToken');

      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
