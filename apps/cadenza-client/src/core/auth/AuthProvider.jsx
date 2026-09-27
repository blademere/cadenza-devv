import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authService } from "@/pages/auth/services/authService";
import { apiClient } from "@/core/api/apiClient";

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authentication when the app starts
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAccessToken =
          localStorage.getItem("accessToken");

        const storedCsrfToken =
          localStorage.getItem("csrfToken");

        if (storedAccessToken) {
          apiClient.setAccessToken(storedAccessToken);
        }

        if (storedCsrfToken) {
          apiClient.setCsrfToken(storedCsrfToken);
        }

        // Configure automatic refresh
        apiClient.setRefreshHandler(async () => {
          try {
            const response = await authService.refresh();

            const refreshData =
              response?.data?.data ??
              response?.data ??
              response;

            if (!refreshData?.accessToken) {
              return false;
            }

            apiClient.setAccessToken(
              refreshData.accessToken,
            );

            localStorage.setItem(
              "accessToken",
              refreshData.accessToken,
            );

            if (refreshData.csrfToken) {
              apiClient.setCsrfToken(
                refreshData.csrfToken,
              );

              localStorage.setItem(
                "csrfToken",
                refreshData.csrfToken,
              );
            }

            return true;
          } catch {
            apiClient.clearAccessToken();

            localStorage.removeItem("accessToken");
            localStorage.removeItem("csrfToken");

            setUser(null);

            return false;
          }
        });

        // If we have a stored token, get the current user
        if (storedAccessToken) {
          const response = await authService.me();

          const currentUser =
            response?.data?.data ??
            response?.data ??
            response;

          if (currentUser) {
            setUser(
              currentUser.user ??
              currentUser,
            );
          }
        }
      } catch {
        apiClient.clearAccessToken();

        localStorage.removeItem("accessToken");
        localStorage.removeItem("csrfToken");

        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);

    try {
      const response =
        await authService.login(credentials);

      const authData =
        response?.data?.data ??
        response?.data ??
        response;

      if (!authData?.accessToken) {
        throw new Error(
          "Login response did not contain an access token.",
        );
      }

      apiClient.setAccessToken(
        authData.accessToken,
      );

      localStorage.setItem(
        "accessToken",
        authData.accessToken,
      );

      if (authData.csrfToken) {
        apiClient.setCsrfToken(
          authData.csrfToken,
        );

        localStorage.setItem(
          "csrfToken",
          authData.csrfToken,
        );
      }

      // Select Cadenza client application
      const applicationResponse =
        await authService.selectApplication(
          "cadenza-client",
        );

      const applicationData =
        applicationResponse?.data?.data ??
        applicationResponse?.data ??
        applicationResponse;

      if (applicationData?.accessToken) {
        apiClient.setAccessToken(
          applicationData.accessToken,
        );

        localStorage.setItem(
          "accessToken",
          applicationData.accessToken,
        );
      }

      const meResponse =
        await authService.me();

      const meData =
        meResponse?.data?.data ??
        meResponse?.data ??
        meResponse;

      const currentUser =
        meData?.user ??
        meData ??
        {
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

      localStorage.removeItem("accessToken");
      localStorage.removeItem("csrfToken");

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
    [
      user,
      isLoading,
      login,
      register,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}