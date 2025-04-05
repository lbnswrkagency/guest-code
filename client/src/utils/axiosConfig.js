import axios from "axios";
import tokenService from "./tokenService";
import notificationManager from "./notificationManager";

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api",
  timeout: 30000, // 30 seconds timeout
  withCredentials: true, // Important: enables cookies to be sent with requests
});

// Keep track of auth error handling
let isHandlingAuthError = false;
let authErrorTimeout = null;

// Set up response interceptor to handle token refresh and expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If there's no response, just return the error
    if (!error.response) {
      return Promise.reject(error);
    }

    // Handle token expiration (401 Unauthorized)
    if (error.response.status === 401 && !originalRequest._retry) {
      // Mark this request as retried to prevent infinite loops
      originalRequest._retry = true;

      // Skip auth handling for public routes
      const isPublicRoute =
        originalRequest.url.includes("/brands/") ||
        originalRequest.url.includes("/events/") ||
        originalRequest.url.includes("/auth/login") ||
        originalRequest.url.includes("/auth/register");

      // Skip auth error handling for public routes
      if (isPublicRoute) {
        return Promise.reject(error);
      }

      // Prevent multiple simultaneous auth error handling
      if (isHandlingAuthError) {
        return new Promise((resolve, reject) => {
          // Wait for the auth error handling to complete before retrying
          const retryInterval = setInterval(async () => {
            if (!isHandlingAuthError) {
              clearInterval(retryInterval);

              try {
                // Try to refresh the token and retry the request
                await tokenService.ensureFreshToken();
                const response = await axios(originalRequest);
                resolve(response);
              } catch (err) {
                reject(error);
              }
            }
          }, 500); // Check every 500ms

          // Set a timeout to prevent infinite waiting
          setTimeout(() => {
            clearInterval(retryInterval);
            reject(error);
          }, 10000); // 10 second timeout
        });
      }

      try {
        isHandlingAuthError = true;

        // Try to refresh the token
        if (!originalRequest.url.includes("/auth/refresh-token")) {
          try {
            await tokenService.refreshToken();

            // Retry the original request with the new token
            return axios(originalRequest);
          } catch (refreshError) {
            // If refresh fails and we're not on a public page, trigger auth required event
            const isPublicBrandOrEventRoute =
              window.location.pathname.startsWith("/@");

            if (!isPublicBrandOrEventRoute) {
              // Dispatch an event that the auth context can listen for
              const authRequiredEvent = new CustomEvent("auth:required", {
                detail: {
                  message: "Your session has expired. Please login again.",
                  redirectUrl: window.location.pathname,
                },
              });

              window.dispatchEvent(authRequiredEvent);
            }

            throw refreshError;
          }
        }
      } catch (e) {
        return Promise.reject(error);
      } finally {
        isHandlingAuthError = false;

        // Clear any existing timeout
        if (authErrorTimeout) {
          clearTimeout(authErrorTimeout);
        }

        // Set a new timeout to reset the flag after some time
        authErrorTimeout = setTimeout(() => {
          isHandlingAuthError = false;
        }, 5000);
      }
    }

    return Promise.reject(error);
  }
);

// Initialize token service with this axios instance
tokenService.init(axiosInstance);

export default axiosInstance;
