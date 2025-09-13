import axios, { AxiosHeaders } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adm_token");
  const headers = AxiosHeaders.from(config.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (import.meta.env.VITE_ADMIN_API_KEY) {
    headers.set("x-api-key", String(import.meta.env.VITE_ADMIN_API_KEY));
  }
  config.headers = headers;
  return config;
});
