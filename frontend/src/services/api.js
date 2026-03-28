import axios from "axios";

const defaultBaseUrl = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : "https://curiohub-backend.onrender.com/api";

const configuredBaseUrl = (
  import.meta.env.VITE_API_URL || defaultBaseUrl
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: configuredBaseUrl.endsWith("/api")
    ? configuredBaseUrl
    : `${configuredBaseUrl}/api`,
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export default api;
