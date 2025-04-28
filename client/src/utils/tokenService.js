// tokenService.js - Centralized token management
import axios from "axios";
import { jwtDecode } from "jwt-decode";

class TokenService {
  constructor() {
    this.axiosInstance = null;
    this.refreshPromise = null;
    this.isRefreshing = false;
    this.refreshTimer = null;
    this.sessionPingTimer = null;
    this.tokenRefreshListeners = [];

    // Initialize ping interval (2 minutes instead of 2.5 minutes for more reliability)
    this.PING_INTERVAL = 2 * 60 * 1000;

    // Initialize refresh threshold (50% of token lifetime)
    this.REFRESH_THRESHOLD = 0.5;
  }

  // Initialize with axiosInstance and start timers
  init(axiosInstance) {
    this.axiosInstance = axiosInstance;
    this.setupRefreshTimer();
    this.setupSessionPing();

    // Add window focus event to trigger token check when tab becomes active
    window.addEventListener("focus", this.handleWindowFocus);

    return this;
  }

  // Handle window focus event to check token immediately when user returns to tab
  handleWindowFocus = () => {
    if (document.visibilityState === "visible") {
      console.log(
        "[tokenService] Window focus detected, checking token validity"
      );
      this.checkAndRefreshToken();
      this.pingSession();
    }
  };

  // Set up a timer to regularly check and refresh tokens
  setupRefreshTimer() {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Set up a new timer that checks tokens every 5 minutes
    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Set up a lightweight ping to keep the session active
  setupSessionPing() {
    // Clear any existing ping timer
    if (this.sessionPingTimer) {
      clearInterval(this.sessionPingTimer);
    }

    // Set up regular pings to keep session active - but only if we're in an active tab
    this.sessionPingTimer = setInterval(() => {
      // Only ping if document is visible (active tab)
      if (document.visibilityState === "visible") {
        console.log("[tokenService] Sending session ping");
        this.pingSession().catch((err) => {
          console.error("[tokenService] Ping failed:", err);
          // Silent catch
        });
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Pings the server to keep the session alive
   * Lightweight check that's useful for detecting expired sessions
   */
  async pingSession() {
    // Skip ping if no token available - don't throw error to avoid state changes
    if (!this.getToken()) {
      return { status: "no-token" };
    }

    try {
      // Log the exact URL being used
      const pingUrl = "/auth/ping";

      // Use the configured axiosInstance instead of axios global
      if (!this.axiosInstance) {
        return { status: "error", message: "axiosInstance not initialized" };
      }

      // Call the lightweight ping endpoint
      const response = await this.axiosInstance.get(pingUrl, {
        // Add cache-busting to avoid cached responses
        params: {
          _t: new Date().getTime(),
        },
      });

      // If we got a new token from the ping, update it without triggering state changes
      if (response.data && response.data.tokenRefreshed) {
        console.log("[tokenService] Token refreshed from ping");
        // Try to extract token from cookies instead of relying on response
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
          cookie = cookie.trim();
          if (cookie.startsWith("accessToken=")) {
            const token = cookie.substring(
              "accessToken=".length,
              cookie.length
            );
            if (token) {
              // Update token in storage but avoid state changes
              localStorage.setItem("token", token);
              // Don't update axiosInstance here to avoid triggering changes
            }
          }
        }
      }

      return response.data;
    } catch (error) {
      // If ping fails with 401, try to refresh the token
      if (error.response && error.response.status === 401) {
        console.log(
          "[tokenService] Ping failed with 401, trying to refresh token"
        );
        try {
          await this.refreshToken();
          return { status: "refreshed" };
        } catch (refreshError) {
          console.error(
            "[tokenService] Refresh after ping failure failed:",
            refreshError
          );
          return { status: "refresh-failed", message: refreshError.message };
        }
      }

      // Don't throw error to avoid propagating to AuthContext unnecessarily
      return { status: "error", message: error.message };
    }
  }

  // Check if token needs refresh and refresh if needed
  async checkAndRefreshToken() {
    const token = this.getToken();

    if (token) {
      try {
        // Check if token is expired or near expiry
        if (this.isTokenExpiredOrNearExpiry(token)) {
          await this.refreshToken();
        }
      } catch (error) {
        // Silent error
      }
    }
  }

  // Ensure we have a fresh token before making important API calls
  async ensureFreshToken() {
    const token = this.getToken();

    // If no token, nothing to do
    if (!token) return false;

    // If token is nearing expiry, refresh it
    if (this.isTokenExpiredOrNearExpiry(token)) {
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        // Silent error
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
      // Silent error
      return true; // If we can't decode, assume it needs refresh
    }
  }

  // Get token from localStorage
  getToken() {
    return localStorage.getItem("token");
  }

  // Get refresh token from localStorage
  getRefreshToken() {
    return localStorage.getItem("refreshToken");
  }

  // Set token in localStorage
  setToken(token) {
    if (token) {
      localStorage.setItem("token", token);
      // Also update Authorization header
      if (this.axiosInstance) {
        this.axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
      }
    }
  }

  // Set refresh token in localStorage
  setRefreshToken(refreshToken) {
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
  }

  // Clear all tokens
  clearTokens() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    if (this.axiosInstance) {
      delete this.axiosInstance.defaults.headers.common["Authorization"];
    }
  }

  // Refresh the token
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

        // Update tokens in localStorage
        this.setToken(response.data.token);
        this.setRefreshToken(response.data.refreshToken);

        // Notify any listeners that token has been refreshed
        this.notifyTokenRefreshed(response.data.token);

        resolve(response.data);
      } catch (error) {
        // Clear tokens on refresh failure
        this.clearTokens();
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
        // Silent error
      }
    });
  }

  // Clean up all timers and listeners
  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.sessionPingTimer) {
      clearInterval(this.sessionPingTimer);
      this.sessionPingTimer = null;
    }

    // Remove window focus listener
    window.removeEventListener("focus", this.handleWindowFocus);

    // Clear all token refresh listeners
    this.tokenRefreshListeners = [];

    // Reset flags
    this.isRefreshing = false;
    this.refreshPromise = null;

    console.log("[tokenService] Cleanup completed");
  }
}

// Create singleton instance
const tokenService = new TokenService();

export default tokenService;
