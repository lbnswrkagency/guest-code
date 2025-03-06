import axios from "axios";

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
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000",
  withCredentials: true, // This ensures cookies are sent with requests
});

// Add request interceptor to ensure credentials are always sent
axiosInstance.interceptors.request.use(
  (config) => {
    // Always include the latest token from localStorage
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // Ensure cookies are sent with every request
    config.withCredentials = true;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((err, token) => {
            if (err) {
              reject(err);
            } else {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              resolve(axiosInstance(originalRequest));
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${axiosInstance.defaults.baseURL}/api/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        if (response.data.token) {
          // Store the new tokens
          const newToken = response.data.token;
          localStorage.setItem("token", newToken);

          if (response.data.refreshToken) {
            localStorage.setItem("refreshToken", response.data.refreshToken);
          }

          // Update the authorization header
          axiosInstance.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${newToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

          // Process any queued requests
          processQueue(null, newToken);
          isRefreshing = false;

          // Retry the original request
          return axiosInstance(originalRequest);
        } else {
          return Promise.reject(new Error("No token in refresh response"));
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear tokens and redirect to login if needed
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");

        // Only redirect to login if this is a page that requires auth
        const requiresAuth = window.location.pathname.match(
          /^\/dashboard|^\/events|^\/guest-code-settings/
        );
        if (requiresAuth) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
