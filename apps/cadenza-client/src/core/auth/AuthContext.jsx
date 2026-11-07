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
const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'lastActivityAt';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const clearInactiveSession = useCallback(() => {
    apiClient.clearAccessToken();
    apiClient.setCsrfToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('csrfToken');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    const loginPath = window.location.pathname.startsWith('/staff') ? '/staff' : '/login';
    window.location.replace(`${loginPath}?reason=inactive`);
  }, []);
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    try {
      const authData = await authService.login(credentials);
      setUser(authData.user ?? null);
      setAccount(authData.account ?? null);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
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
    const lastActivityAt = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);

    if (lastActivityAt && Date.now() - lastActivityAt >= INACTIVITY_LIMIT_MS) {
      clearInactiveSession();
      return;
    }
    if (storedCsrfToken) {
      apiClient.setCsrfToken(storedCsrfToken);
    }
    try {
      const response = await authService.me();
      const authData = response?.data;
      setUser(authData?.user ?? null);
      setAccount(authData?.account ?? null);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
      apiClient.clearAccessToken();
      apiClient.setCsrfToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('csrfToken');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      setUser(null);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, [clearInactiveSession]);
  const register = useCallback(async (details) => {
    setIsLoading(true);
    try {
      return await authService.register(details);
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
}, [clearInactiveSession, loadCurrentUser]);

useEffect(() => {
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'hidden') {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      return;
    }

    const lastActivityAt = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (lastActivityAt && Date.now() - lastActivityAt >= INACTIVITY_LIMIT_MS && user) {
      try {
        await authService.logout();
      } finally {
        clearInactiveSession();
      }
    } else if (user) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [clearInactiveSession, user]);
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
