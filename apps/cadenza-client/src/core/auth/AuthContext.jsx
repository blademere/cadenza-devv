import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '@/services/auth/authService';
import { apiClient } from '@/core/api/apiClient';
export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    try {
      const authData = await authService.login(credentials);
      setUser(authData.user ?? null);
      setAccount(authData.account ?? null);
      return { user: authData.user ?? null, account: authData.account ?? null };
    } finally {
      setIsLoading(false);
    }
  }, []);
  const loadCurrentUser = useCallback(async () => {
    const storedAccessToken = localStorage.getItem('accessToken');
    if (!storedAccessToken) {
      setUser(null);
      setAccount(null);
      setIsLoading(false);
      return;
    }
    apiClient.setAccessToken(storedAccessToken);
    const storedCsrfToken = localStorage.getItem('csrfToken');
    if (storedCsrfToken) {
      apiClient.setCsrfToken(storedCsrfToken);
    }
    try {
      const response = await authService.me();
      const authData = response?.data;
      setUser(authData?.user ?? null);
      setAccount(authData?.account ?? null);
    } catch {
      authService.clearSession();
      setUser(null);
      setAccount(null);
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
      setUser(null);
      setAccount(null);
    }
  }, []);
  useEffect(() => {
    apiClient.setRefreshHandler(authService.refresh);
    loadCurrentUser();
    return () => {
      apiClient.setRefreshHandler(null);
    };
  }, [loadCurrentUser]);
  const value = useMemo(
    () => ({
      user,
      account,
      isLoading,
      isAuthenticated: Boolean(user && account),
      login,
      register,
      logout,
    }),
    [user, account, isLoading, login, register, logout],
  );
  return (
    <AuthContext.Provider value={value}> {children} </AuthContext.Provider>
  );
}
