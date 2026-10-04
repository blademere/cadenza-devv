import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "user";
const TOKEN_KEY = "auth_token";

// Save logged-in user and JWT token
export async function saveAuth(data) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));

  await AsyncStorage.setItem(TOKEN_KEY, data.token);
}

// Get saved user
export async function getUser() {
  const user = await AsyncStorage.getItem(USER_KEY);

  return user ? JSON.parse(user) : null;
}

// Get JWT token
export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

// Remove login information
export async function logout() {
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
}
