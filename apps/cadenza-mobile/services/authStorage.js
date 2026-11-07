import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "user";
const ACCOUNT_KEY = "account";
const TOKEN_KEY = "auth_token";
const CSRF_KEY = "csrf_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const LAST_ACTIVITY_KEY = "last_activity_at";

export async function saveAuth(data) {
  const authData = data?.data ?? data;
  const token = authData?.accessToken ?? authData?.token;

  if (!token || !authData?.user) {
    throw new Error("Invalid authentication response.");
  }

  await AsyncStorage.multiSet([
    [USER_KEY, JSON.stringify(authData.user)],
    [ACCOUNT_KEY, JSON.stringify(authData.account ?? null)],
    [TOKEN_KEY, token],
    [REFRESH_TOKEN_KEY, authData.refreshToken ?? ""],
    [CSRF_KEY, authData.csrfToken ?? ""],
    [LAST_ACTIVITY_KEY, String(Date.now())],
  ]);
}

export async function saveAccessToken(accessToken) {
  if (accessToken) await AsyncStorage.setItem(TOKEN_KEY, accessToken);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function saveRefreshToken(refreshToken) {
  if (refreshToken) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getLastActivityAt() {
  const value = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
  return Number(value || 0);
}

export async function touchActivity() {
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

// Get saved user
export async function getUser() {
  const user = await AsyncStorage.getItem(USER_KEY);

  return user ? JSON.parse(user) : null;
}

export async function getAccount() {
  const account = await AsyncStorage.getItem(ACCOUNT_KEY);

  return account ? JSON.parse(account) : null;
}

// Get JWT token
export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function getCsrfToken() {
  return await AsyncStorage.getItem(CSRF_KEY);
}

export async function logout() {
  await AsyncStorage.multiRemove([USER_KEY, ACCOUNT_KEY, TOKEN_KEY, REFRESH_TOKEN_KEY, CSRF_KEY, LAST_ACTIVITY_KEY]);
}
