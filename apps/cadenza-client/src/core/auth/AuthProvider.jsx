import {
createContext,
useCallback,
useEffect,
useMemo,
useState,
} from "react";

import { authService } from "@/services/admin/authService";
import { apiClient } from "@/core/api/apiClient";

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
const [user, setUser] = useState(null);
const [account, setAccount] = useState(null);
const [isLoading, setIsLoading] = useState(true);

const clearAuthentication = useCallback(() => {
apiClient.clearAccessToken();
apiClient.setCsrfToken(null);

localStorage.removeItem("accessToken");
localStorage.removeItem("csrfToken");

setUser(null);
setAccount(null);

}, []);

const loadCurrentUser = useCallback(async () => {
const response = await authService.me();
const authData = response?.data;

if (!authData?.user || !authData?.account) {
  throw new Error("Invalid authentication response.");
}

setUser(authData.user);
setAccount(authData.account);

return authData;

}, []);

const login = useCallback(async (credentials) => {
setIsLoading(true);

try {
  const authData = await authService.login(credentials);

  if (!authData?.accessToken) {
    throw new Error(
      "Login response did not contain an access token.",
    );
  }

  if (!authData?.user || !authData?.account) {
    throw new Error(
      "Login response did not contain complete authentication data.",
    );
  }

  setUser(authData.user);
  setAccount(authData.account);

  return {
    user: authData.user,
    account: authData.account,
  };
} catch (error) {
  clearAuthentication();
  throw error;
} finally {
  setIsLoading(false);
}

}, [clearAuthentication]);

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
clearAuthentication();
}
}, [clearAuthentication]);

useEffect(() => {
let mounted = true;

const initializeAuth = async () => {
  try {
    apiClient.setRefreshHandler(authService.refresh);

    const storedAccessToken =
      localStorage.getItem("accessToken");

    const storedCsrfToken =
      localStorage.getItem("csrfToken");

    if (!storedAccessToken) {
      return;
    }

    apiClient.setAccessToken(storedAccessToken);

    if (storedCsrfToken) {
      apiClient.setCsrfToken(storedCsrfToken);
    }

    try {
      await loadCurrentUser();
    } catch (error) {
      if (error?.status !== 401) {
        throw error;
      }

      const refreshed = await authService.refresh();

      if (!refreshed) {
        throw new Error("Session refresh failed.");
      }

      await loadCurrentUser();
    }
  } catch {
    if (mounted) {
      clearAuthentication();
    }
  } finally {
    if (mounted) {
      setIsLoading(false);
    }
  }
};

initializeAuth();

return () => {
  mounted = false;
  apiClient.setRefreshHandler(null);
};

}, [clearAuthentication, loadCurrentUser]);

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
[
user,
account,
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
