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

    // Initialize ping interval (2.5 minutes)
    this.PING_INTERVAL = 2.5 * 60 * 1000;

    // Initialize refresh threshold (50% of token lifetime)
    this.REFRESH_THRESHOLD = 0.5;
  }

  // Initialize with axiosInstance and start timers
  init(axiosInstance) {
    this.axiosInstance = axiosInstance;
    this.setupRefreshTimer();
    this.setupSessionPing();
    return this;
  }

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

    // Set up regular pings to keep session active
    this.sessionPingTimer = setInterval(() => {
      this.pingSession();
    }, this.PING_INTERVAL);
  }

  // Lightweight call to keep session alive
  async pingSession() {
    try {
      const token = this.getToken();
      // Only ping if we have a token
      if (token) {
        // First check if token needs refresh
        if (this.isTokenExpiredOrNearExpiry(token)) {
          await this.refreshToken();
        } else {
          // Just ping a lightweight endpoint
          await this.axiosInstance.get("/auth/ping", {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    } catch (error) {
      console.log("Session ping failed, will retry on next interval");
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
        console.error("Token refresh check failed:", error);
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
        console.error("Error in token refresh listener:", error);
      }
    });
  }

  // Stop all timers
  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.sessionPingTimer) {
      clearInterval(this.sessionPingTimer);
      this.sessionPingTimer = null;
    }
  }
}

// Create singleton instance
const tokenService = new TokenService();

export default tokenService;
