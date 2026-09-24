import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT access token
api.interceptors.request.use(
  (config) => {
    // Avoid sending authorization header for unauthenticated endpoints
    if (!config.url.includes("/auth/login") && !config.url.includes("/auth/register")) {
      const token = localStorage.getItem("fln_access_token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry / 401 refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/register")
    ) {
      const refreshToken = localStorage.getItem("fln_refresh_token");
      
      if (refreshToken && !originalRequest.url.includes("/auth/refresh")) {
        originalRequest._retry = true;
        try {
          const res = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } }
          );
          
          if (res.data.status === "success") {
            localStorage.setItem("fln_access_token", res.data.access_token);
            originalRequest.headers["Authorization"] = `Bearer ${res.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem("fln_access_token");
          localStorage.removeItem("fln_refresh_token");
          localStorage.removeItem("fln_user");
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
