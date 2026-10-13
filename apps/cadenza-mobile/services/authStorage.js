import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "user";
const ACCOUNT_KEY = "account";
const TOKEN_KEY = "auth_token";
const CSRF_KEY = "csrf_token";

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
    [CSRF_KEY, authData.csrfToken ?? ""],
  ]);
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
  await AsyncStorage.multiRemove([USER_KEY, ACCOUNT_KEY, TOKEN_KEY, CSRF_KEY]);
}
