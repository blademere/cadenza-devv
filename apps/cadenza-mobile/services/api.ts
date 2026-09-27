import axios from "axios";
import { getToken } from "./authStorage";

const DEFAULT_API_BASE_URL = "http://localhost:5000/api/mobile/v1";

const configuredBaseUrl =
  process.env.EXPO_PUBLIC_MOBILE_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  DEFAULT_API_BASE_URL;

// Guard against relative base URLs that can accidentally target Expo dev server routes.
const API_BASE_URL = /^https?:\/\//i.test(configuredBaseUrl)
  ? configuredBaseUrl
  : DEFAULT_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;