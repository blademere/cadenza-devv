import axios from "axios";
import { Platform } from "react-native";
import { getToken } from "./authStorage";

const DEFAULT_API_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const DEFAULT_API_BASE_URL = `http://${DEFAULT_API_HOST}:3000/api/v1/cadenza-mobile`;

const configuredBaseUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL?.trim();

export const API_BASE_URL = configuredBaseUrl || DEFAULT_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
