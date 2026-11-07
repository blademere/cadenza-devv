import axios from "axios";
import { Platform } from "react-native";
import { getCsrfToken, getRefreshToken, getToken, saveAccessToken, saveRefreshToken, touchActivity } from "./authStorage";

const DEFAULT_API_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const DEFAULT_API_BASE_URL = `http://${DEFAULT_API_HOST}:3000/api/v1/cadenza-mobile`;
const PRODUCTION_API_BASE_URL = "https://api.cadenza.waax.online/api/v1/cadenza-mobile";

const configuredBaseUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL?.trim();
const isLocalBaseUrl = /(^|\/\/)(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/i.test(
  configuredBaseUrl || '',
);

// Keep local development on the local API, but make a release build usable
// even when the EAS variable was omitted from the build environment.
export const API_BASE_URL = !__DEV__ && isLocalBaseUrl
  ? PRODUCTION_API_BASE_URL
  : configuredBaseUrl || (__DEV__ ? DEFAULT_API_BASE_URL : PRODUCTION_API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const isPublicAuthRequest = (url = '') => [
  '/auth/login',
  '/auth/password/reset/request',
  '/auth/password/reset/code/request',
  '/auth/password/reset/code/verify',
  '/auth/password/reset',
  '/auth/oauth/google',
].some((path) => url.endsWith(path));

api.interceptors.request.use(async (config) => {
  // These endpoints must remain usable while the local session is expired or
  // invalid. A stale bearer token can make older production API deployments
  // reject an otherwise public login/reset request with a 401.
  if (isPublicAuthRequest(config.url)) {
    return config;
  }

  const token = await getToken();
  await touchActivity();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshPromise = null;
api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original?._retryAuth || original?._skipAuthRefresh || original?.url?.endsWith('/auth/refresh') || isPublicAuthRequest(original?.url)) throw error;
  original._retryAuth = true;
  try {
    refreshPromise ||= api.post('/auth/refresh', { refreshToken: await getRefreshToken() }, { _skipAuthRefresh: true, headers: { 'X-CSRF-Token': await getCsrfToken(), 'Idempotency-Key': `mobile-refresh-${Date.now()}` } });
    const response = await refreshPromise;
    refreshPromise = null;
    const accessToken = response.data?.data?.accessToken ?? response.data?.accessToken;
    await saveAccessToken(accessToken);
    await saveRefreshToken(response.data?.data?.refreshToken ?? response.data?.refreshToken);
    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${accessToken}`;
    return api(original);
  } catch (refreshError) {
    refreshPromise = null;
    throw error;
  }
});

export default api;
