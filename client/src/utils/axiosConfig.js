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

// Add a global flag to track if we're already handling a session expiration
let isHandlingSessionExpiration = false;

// Set up response interceptor to handle token refresh and expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If there's no response or we've already tried to refresh, just return the error
    if (!error.response || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Handle token expiration (401 Unauthorized)
    if (error.response.status === 401) {
      // Only handle session expiration once to prevent multiple redirects and messages
      if (isHandlingSessionExpiration) {
        return Promise.reject(error);
      }

      // IMPORTANT: Check the current URL path to determine if we're on a public page
      const isPublicBrandOrEventRoute =
        window.location.pathname.startsWith("/@");
      if (isPublicBrandOrEventRoute) {
        console.log(
          "[axiosConfig] Skipping login redirect for public brand/event route:",
          window.location.pathname
        );
        return Promise.reject(error);
      }

      // Skip redirect for brand-related API calls - these should be publicly accessible
      if (
        originalRequest.url.includes("/brands/") ||
        originalRequest.url.includes("/events/")
      ) {
        console.log(
          "[axiosConfig] Skipping login redirect for brand/event API call:",
          originalRequest.url
        );
        return Promise.reject(error);
      }

      // Set flag to prevent multiple redirects
      isHandlingSessionExpiration = true;

      try {
        // Try to refresh the token if we're not on the auth routes
        if (!originalRequest.url.includes("/auth/")) {
          // Handle refresh token logic here if needed
          // ...
        }

        // If we can't refresh, redirect to login with a message
        const redirectUrl = "/login";
        // Only redirect if we're not already on a public brand/event route
        if (
          !isPublicBrandOrEventRoute &&
          window.location.pathname !== redirectUrl
        ) {
          console.log("[axiosConfig] Redirecting to login due to 401 error");
          window.location.href = redirectUrl;
        }

        // Return a rejected promise but prevent multiple errors
        return Promise.reject({
          ...error,
          handled: true, // Mark as handled
        });
      } catch (refreshError) {
        // Reset the flag after some time to allow future attempts
        setTimeout(() => {
          isHandlingSessionExpiration = false;
        }, 5000);

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Initialize token service with this axios instance
tokenService.init(axiosInstance);

export default axiosInstance;
