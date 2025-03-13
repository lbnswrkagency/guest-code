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
  const [authInitialized, setAuthInitialized] = useState(false);
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
      setLoading(true);
      const response = await axiosInstance.get("/auth/user");
      if (response.data) {
        // Clean the username when fetching user data
        response.data.username = cleanUsername(response.data.username);
      }
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add initial auth check
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await fetchUserData();
        } catch (error) {
          // Only redirect if on a protected route
          if (pathsRequiringAuth.includes(location.pathname)) {
            navigate("/login", { state: { from: location } });
          }
        }
      }
      setLoading(false);
      setAuthInitialized(true);
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
          setLoading(true);

          try {
            // Attempt to refresh tokens
            await axiosInstance.post("/auth/refresh-token");
            setIsRefreshing(false);
            setLoading(false);
            // Retry the original request
            return axiosInstance(originalRequest);
          } catch (refreshError) {
            setIsRefreshing(false);
            setUser(null);
            setLoading(false);
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
          // Silent fail for periodic refresh
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
          navigate("/login", { state: { from: location } });
        } finally {
          setLoading(false);
        }
      }
    };

    if (authInitialized) {
      checkAuthState();
    }
  }, [location.pathname, authInitialized]);

  const login = async (credentials) => {
    try {
      setLoading(true);
      console.log("[AuthContext] Attempting login with:", {
        credential: credentials.email,
        isEmail: credentials.email.includes("@"),
        timestamp: new Date().toISOString(),
      });

      const response = await axiosInstance.post("/auth/login", credentials);

      // Clean the username when logging in
      if (response.data.user) {
        response.data.user.username = cleanUsername(
          response.data.user.username
        );

        console.log("[AuthContext] Login successful:", {
          userId: response.data.user._id,
          username: response.data.user.username,
          email: response.data.user.email,
          hasToken: !!response.data.token,
          hasRefreshToken: !!response.data.refreshToken,
          timestamp: new Date().toISOString(),
        });
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("refreshToken", response.data.refreshToken);

      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${response.data.token}`;

      setUser(response.data.user);
      setLoading(false);

      navigate(`/@${response.data.user.username}`);
    } catch (error) {
      console.error("[AuthContext] Login failed:", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        credential: credentials.email,
        isEmail: credentials.email.includes("@"),
        timestamp: new Date().toISOString(),
      });

      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await axiosInstance.post("/auth/logout");

      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");

      setUser(null);
      setLoading(false);
      navigate("/login");
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      setLoading(false);
      navigate("/login");
    }
  };

  const value = {
    user,
    setUser,
    loading,
    authInitialized,
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
