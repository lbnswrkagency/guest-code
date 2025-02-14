import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosConfig";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const pathsRequiringAuth = [
    "/dashboard",
    "/events",
    "/events/create",
    "/events/:eventId",
    "/guest-code-settings",
    "/register",
    "/registration-success",
    "/verify/:token",
  ];

  const fetchUserData = async () => {
    try {
      const response = await axiosInstance.get("/auth/user");
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  };

  // Setup axios interceptor for token refresh
  useEffect(() => {
    let refreshTimeout;
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops
        if (originalRequest._retry || isRefreshing) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401) {
          originalRequest._retry = true;
          setIsRefreshing(true);

          try {
            // Attempt to refresh tokens
            await axiosInstance.post("/auth/refresh-token");
            setIsRefreshing(false);
            // Retry the original request
            return axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            setIsRefreshing(false);
            setUser(null);
            navigate("/login", { state: { from: location } });
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Set up periodic token refresh (every 14 minutes)
    const setupRefreshTimer = () => {
      refreshTimeout = setInterval(async () => {
        try {
          if (user) {
            await axiosInstance.post("/auth/refresh-token");
          }
        } catch (error) {
          console.error("Periodic token refresh failed:", error);
        }
      }, 14 * 60 * 1000); // 14 minutes
    };

    setupRefreshTimer();

    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
      clearInterval(refreshTimeout);
    };
  }, [navigate, location, user, isRefreshing]);

  // Check auth state when path changes
  useEffect(() => {
    const checkAuthState = async () => {
      if (pathsRequiringAuth.includes(location.pathname)) {
        setLoading(true);
        try {
          await fetchUserData();
        } catch (error) {
          console.error("Auth state check failed:", error);
          navigate("/login", { state: { from: location } });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuthState();
  }, [location.pathname]);

  const login = async (credentials) => {
    console.log("[AuthContext] Starting login process", {
      timestamp: new Date().toISOString(),
      hasEmail: !!credentials.email,
    });

    try {
      // Clear any existing tokens first
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");

      console.log("[AuthContext] Making login request to server");
      const response = await axiosInstance.post("/auth/login", credentials);

      if (!response.data.user || !response.data.token) {
        console.error("[AuthContext] Invalid login response:", response.data);
        throw new Error("Invalid login response");
      }

      console.log("[AuthContext] Login successful, setting tokens and user");

      // Set tokens first
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("refreshToken", response.data.refreshToken);

      // Update axios default headers
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${response.data.token}`;

      // Then set user state
      setUser(response.data.user);

      console.log("[AuthContext] Login complete, navigating to dashboard");
      navigate("/dashboard");
    } catch (error) {
      console.error("[AuthContext] Login error:", {
        message: error.message,
        response: error.response?.data,
      });
      // Clear everything on error
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] Starting logout process");

      // Call server logout endpoint
      await axiosInstance.post("/auth/logout");

      // Clear all auth-related data
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");

      // Clear user state
      setUser(null);

      console.log("[AuthContext] Logout successful, redirecting to login");
      navigate("/login");
    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
      // Still clear local data even if server logout fails
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      navigate("/login");
    }
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    fetchUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
