import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const BASE_URL = "https://aurelle.uz";

const SESSION_KEY = "aurelle_session";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Attach stored session cookie on every request
api.interceptors.request.use(async (config) => {
  const cookie = await SecureStore.getItemAsync(SESSION_KEY);
  if (cookie) {
    config.headers["Cookie"] = cookie;
  }
  return config;
});

// Persist Set-Cookie from responses; navigate to Login on 401
api.interceptors.response.use(
  (response) => {
    const setCookie = response.headers["set-cookie"];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie)
        ? setCookie.join("; ")
        : setCookie;
      SecureStore.setItemAsync(SESSION_KEY, cookieStr).catch(() => {});
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored session
      SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    }
    return Promise.reject(error);
  },
);

export { SESSION_KEY };
