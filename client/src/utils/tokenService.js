// tokenService.js - Centralized token management
import axios from "axios";
import { jwtDecode } from "jwt-decode";

class TokenService {
  constructor() {
    this.axiosInstance = null;
    this.refreshPromise = null;
    this.isRefreshing = false;
    this.refreshTimer = null;
    this.tokenRefreshListeners = [];

    // Refresh threshold (75% of token lifetime - more conservative with longer tokens)
    this.REFRESH_THRESHOLD = 0.75;
  }

  // Initialize with axiosInstance and start background refresh
  init(axiosInstance) {
    this.axiosInstance = axiosInstance;
    this.setupRefreshTimer();
    this.setupVisibilityListener();
    return this;
  }

  // Setup page visibility listener to refresh token when page becomes visible
  setupVisibilityListener() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        // When page becomes visible (app comes to foreground)
        this.checkAndRefreshToken();
      }
    });
  }

  // Set up a timer to proactively refresh tokens
  setupRefreshTimer() {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Get current token to check expiry
    const token = this.getTokenFromCookie();
    if (!token) return;

    try {
      // Calculate when to refresh (75% through the token lifetime)
      const decoded = jwtDecode(token);
      const tokenLifetime = decoded.exp - decoded.iat;
      const refreshAt = decoded.iat + tokenLifetime * this.REFRESH_THRESHOLD;
      const now = Math.floor(Date.now() / 1000);

      // Calculate time until refresh in milliseconds
      let timeUntilRefresh = (refreshAt - now) * 1000;

      // If already past refresh time, do it immediately
      if (timeUntilRefresh < 0) {
        this.checkAndRefreshToken();
        return;
      }

      // Schedule the refresh at exactly the right time
      this.refreshTimer = setTimeout(() => {
        this.checkAndRefreshToken();
        // After refreshing, set up the next cycle
        this.setupRefreshTimer();
      }, timeUntilRefresh);

      console.log(
        `[TokenService] Token refresh scheduled in ${Math.floor(
          timeUntilRefresh / 1000 / 60
        )} minutes`
      );
    } catch (error) {
      console.error("Error scheduling token refresh:", error);
      // Fall back to a reasonable default interval for refresh
      this.refreshTimer = setTimeout(() => {
        this.checkAndRefreshToken();
      }, 60 * 60 * 1000); // Hourly refresh
    }
  }

  // Parse the token from cookies
  getTokenFromCookie() {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith("accessToken=")) {
        return cookie.substring("accessToken=".length);
      }
    }
    return null;
  }

  // Get refresh token from cookies (rarely needed, but kept for completeness)
  getRefreshTokenFromCookie() {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith("refreshToken=")) {
        return cookie.substring("refreshToken=".length);
      }
    }
    return null;
  }

  // Check if token needs refresh and refresh if needed
  async checkAndRefreshToken() {
    const token = this.getTokenFromCookie();

    if (token) {
      try {
        // Check if token is expired or near expiry
        if (this.isTokenExpiredOrNearExpiry(token)) {
          await this.refreshToken();
          return true;
        }
      } catch (error) {
        console.error("Token refresh check failed:", error);
        return false;
      }
    }
    return false;
  }

  // Ensure we have a fresh token before making important API calls
  async ensureFreshToken() {
    const token = this.getTokenFromCookie();

    // If no token, nothing to do
    if (!token) return false;

    // If token is nearing expiry, refresh it
    if (this.isTokenExpiredOrNearExpiry(token)) {
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        console.error("Token refresh failed:", error);
        return false;
      }
    }

    // Token is still fresh
    return true;
  }

  // Check if token is expired or nearing expiry
  isTokenExpiredOrNearExpiry(token) {
    if (!token) return true;

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      // Check if token is already expired
      if (decoded.exp <= currentTime) {
        return true;
      }

      // Check if token is nearing expiry (within threshold)
      const tokenLifetime = decoded.exp - decoded.iat;
      const timeUntilExpiry = decoded.exp - currentTime;

      // Return true if less than threshold of lifetime remains
      return timeUntilExpiry < tokenLifetime * this.REFRESH_THRESHOLD;
    } catch (error) {
      console.error("Token decode failed:", error);
      return true; // If we can't decode, assume it needs refresh
    }
  }

  // Legacy method for backward compatibility
  getToken() {
    return this.getTokenFromCookie();
  }

  // Legacy method for backward compatibility
  getRefreshToken() {
    return this.getRefreshTokenFromCookie();
  }

  // Refresh the token - simplified to rely on HTTP-only cookies
  async refreshToken() {
    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    // Create a new refresh promise
    this.refreshPromise = new Promise(async (resolve, reject) => {
      try {
        const response = await this.axiosInstance.post("/auth/refresh-token");

        // Notify any listeners that token has been refreshed
        // (cookies are automatically updated by the server)
        if (response.data.token) {
          this.notifyTokenRefreshed(response.data.token);
        }

        // Reset the refresh timer after a successful refresh
        this.setupRefreshTimer();

        resolve(response.data);
      } catch (error) {
        // Auth error handling is centralized in axios interceptors
        console.error("Token refresh failed:", error);
        reject(error);
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    });

    return this.refreshPromise;
  }

  // Add token refresh listener
  addTokenRefreshListener(listener) {
    this.tokenRefreshListeners.push(listener);
  }

  // Remove token refresh listener
  removeTokenRefreshListener(listener) {
    this.tokenRefreshListeners = this.tokenRefreshListeners.filter(
      (l) => l !== listener
    );
  }

  // Notify listeners that token has been refreshed
  notifyTokenRefreshed(token) {
    this.tokenRefreshListeners.forEach((listener) => {
      try {
        listener(token);
      } catch (error) {
        console.error("Error in token refresh listener:", error);
      }
    });
  }

  // Trigger logout by clearing cookies
  async logout() {
    try {
      // Call server to invalidate the token and clear cookies
      await this.axiosInstance.post("/auth/logout");
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      this.cleanup();
    }
  }

  // Stop all timers
  cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Create singleton instance
const tokenService = new TokenService();

export default tokenService;
