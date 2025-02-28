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
      console.log(
        `[Axios Request] Setting Authorization header for ${
          config.url
        }. Token prefix: ${token.substring(0, 10)}...`
      );
    } else {
      console.log(
        `[Axios Request] No token found for request to ${config.url}`
      );
    }

    // Ensure cookies are sent with every request
    config.withCredentials = true;
    console.log(
      `[Axios Request] Request to ${config.url} with method ${config.method}. withCredentials: ${config.withCredentials}`
    );

    return config;
  },
  (error) => {
    console.log("[Axios Request Error]", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(
      `[Axios Response] Success from ${response.config.url}. Status: ${response.status}`
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.log(
      `[Axios Response Error] Error from ${originalRequest?.url}. Status: ${error.response?.status}. Message: ${error.message}`
    );

    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log(
        "[Axios 401] Unauthorized response detected. Attempting token refresh..."
      );

      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        console.log(
          "[Axios 401] Token refresh already in progress. Queuing request."
        );
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((err, token) => {
            if (err) {
              console.log(
                "[Axios Queue] Rejecting queued request due to refresh error"
              );
              reject(err);
            } else {
              console.log(
                "[Axios Queue] Retrying queued request with new token"
              );
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
        console.log("[Axios 401] Sending refresh token request");
        const response = await axios.post(
          `${axiosInstance.defaults.baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        console.log("[Axios 401] Refresh token response:", response.data);

        if (response.data.token) {
          // Store the new tokens
          const newToken = response.data.token;
          localStorage.setItem("token", newToken);
          console.log(
            `[Axios 401] New token stored. Prefix: ${newToken.substring(
              0,
              10
            )}...`
          );

          if (response.data.refreshToken) {
            localStorage.setItem("refreshToken", response.data.refreshToken);
            console.log("[Axios 401] New refresh token stored");
          }

          // Update the authorization header
          axiosInstance.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${newToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

          console.log("[Axios 401] Headers updated with new token");

          // Process any queued requests
          processQueue(null, newToken);
          isRefreshing = false;

          // Retry the original request
          console.log("[Axios 401] Retrying original request with new token");
          return axiosInstance(originalRequest);
        } else {
          console.log("[Axios 401] No token in refresh response");
          return Promise.reject(new Error("No token in refresh response"));
        }
      } catch (refreshError) {
        // Handle refresh failure
        console.log("[Axios 401] Token refresh failed:", refreshError);
        console.log(
          "[Axios 401] Refresh error response:",
          refreshError.response
        );

        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear tokens and redirect to login if needed
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        console.log("[Axios 401] Tokens cleared from localStorage");

        // Only redirect to login if this is a page that requires auth
        const requiresAuth = window.location.pathname.match(
          /^\/dashboard|^\/events|^\/guest-code-settings/
        );
        if (requiresAuth) {
          console.log("[Axios 401] Redirecting to login page");
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
