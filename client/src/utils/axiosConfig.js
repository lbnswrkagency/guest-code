import axios from "axios";

console.log(
  "[AxiosConfig] Initializing with base URL:",
  process.env.REACT_APP_API_BASE_URL
);

// Flag to track if a token refresh is in progress
let isRefreshing = false;
let refreshSubscribers = [];

// Function to process queued requests
const processQueue = (error, token = null) => {
  refreshSubscribers.forEach((callback) => {
    if (error) {
      callback(error, null);
    } else {
      callback(null, token);
    }
  });
  refreshSubscribers = [];
};

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to ensure credentials are always sent
axiosInstance.interceptors.request.use(
  (config) => {
    console.log("[AxiosConfig] Making request:", {
      url: config.url,
      method: config.method,
      withCredentials: config.withCredentials,
      timestamp: new Date().toISOString(),
    });

    // Always include the latest token from localStorage
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    config.withCredentials = true;
    return config;
  },
  (error) => {
    console.error("[AxiosConfig] Request error:", {
      message: error.message,
      config: error.config,
    });
    return Promise.reject(error);
  }
);

// Global request interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("[AxiosConfig] Response received:", {
      url: response.config.url,
      status: response.status,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log("[AxiosConfig] Attempting token refresh");
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post(
          `/api/auth/refresh-token`,
          {},
          {
            headers: { Authorization: `Bearer ${refreshToken}` },
          }
        );

        if (response.data.token) {
          console.log("[AxiosConfig] Token refresh successful");
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("refreshToken", response.data.refreshToken);

          // Update the original request with new token
          originalRequest.headers[
            "Authorization"
          ] = `Bearer ${response.data.token}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error("[AxiosConfig] Token refresh failed:", refreshError);
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("[AxiosConfig] Response received:", {
      url: response.config.url,
      status: response.status,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  async (error) => {
    console.error("[AxiosConfig] Response error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: new Date().toISOString(),
    });
    return Promise.reject(error);
  }
);

export default axiosInstance;
