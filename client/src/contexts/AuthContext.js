import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosConfig";
import { cleanUsername } from "../utils/stringUtils";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Inner provider that uses router hooks
const AuthProviderWithRouter = ({ children }) => {
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

  // Add logging for user state changes
  useEffect(() => {
    console.log("[AuthContext] Auth state changed:", {
      isAuthenticated: !!user,
      user: user
        ? {
            id: user._id,
            username: user.username,
            email: user.email,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  }, [user]);

  const fetchUserData = async () => {
    try {
      const response = await axiosInstance.get("/auth/user");
      if (response.data) {
        // Clean the username when fetching user data
        response.data.username = cleanUsername(response.data.username);
      }
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Add initial auth check
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await fetchUserData();
        } catch (error) {
          // console.error("Initial auth check failed:", error);
          // Only redirect if on a protected route
          if (pathsRequiringAuth.includes(location.pathname)) {
            navigate("/login", { state: { from: location } });
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []); // Run once on mount

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
            // console.error("Token refresh failed:", refreshError);
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
          // console.error("Periodic token refresh failed:", error);
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
          // console.error("Auth state check failed:", error);
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
    try {
      console.log("[AuthContext] Login attempt:", {
        email: credentials.email,
        timestamp: new Date().toISOString(),
      });

      const response = await axiosInstance.post("/auth/login", credentials);

      // Clean the username when logging in
      if (response.data.user) {
        response.data.user.username = cleanUsername(
          response.data.user.username
        );
      }

      console.log("[AuthContext] Login successful:", {
        userData: {
          id: response.data.user._id,
          username: response.data.user.username,
          email: response.data.user.email,
        },
        timestamp: new Date().toISOString(),
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("refreshToken", response.data.refreshToken);

      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${response.data.token}`;

      setUser(response.data.user);

      navigate(`/@${response.data.user.username}`);
    } catch (error) {
      console.error("[AuthContext] Login failed:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] Logout initiated", {
        currentUser: user?.username,
        timestamp: new Date().toISOString(),
      });

      await axiosInstance.post("/auth/logout");

      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");

      setUser(null);
      navigate("/login");

      console.log("[AuthContext] Logout successful", {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[AuthContext] Logout failed:", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
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

// Outer provider that doesn't use router hooks
export const AuthProvider = ({ children }) => {
  return <AuthProviderWithRouter>{children}</AuthProviderWithRouter>;
};

export default AuthContext;
