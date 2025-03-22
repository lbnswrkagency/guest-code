import axios from "axios";
import tokenService from "./tokenService";
import notificationManager from "./notificationManager";

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api",
  timeout: 30000, // 30 seconds timeout
  withCredentials: true,
});

// Set up request interceptor to add token to all requests
axiosInstance.interceptors.request.use(
  async (config) => {
    // For token refresh requests, don't try to refresh the token
    if (config.url?.includes("/auth/refresh-token")) {
      return config;
    }

    // For all other requests, ensure we have a fresh token
    await tokenService.ensureFreshToken();

    // Get the latest token and add it to the request
    const token = tokenService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Keep track of auth error handling
let isHandlingAuthError = false;

// Set up response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip for refresh token requests or already retried requests
    if (
      originalRequest.url?.includes("/auth/refresh-token") ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // Handle unauthorized errors (401)
    if (error.response?.status === 401) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        await tokenService.refreshToken();

        // Update the original request with the new token
        const token = tokenService.getToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;

        // Retry the original request with the new token
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        tokenService.clearTokens();

        // Prevent multiple auth errors from showing notifications
        if (!isHandlingAuthError) {
          isHandlingAuthError = true;

          // First clear any existing auth notifications
          notificationManager.clearAllAuthNotifications();

          // Show a single notification using our manager
          const message = "Your session has expired. Please login again.";
          notificationManager.showAuthNotification(message);

          // Dispatch a custom event to notify the app of authentication failure
          // This event will trigger the redirect to login
          window.dispatchEvent(
            new CustomEvent("auth:required", {
              detail: {
                redirectUrl: window.location.pathname,
                message: message,
              },
            })
          );

          // Reset the handling flag after a short delay
          setTimeout(() => {
            isHandlingAuthError = false;
          }, 1000);
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Initialize token service with this axios instance
tokenService.init(axiosInstance);

export default axiosInstance;
