import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

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
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/auth/user`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/login");
      }
      throw error;
    }
  };

  // Setup axios interceptor for token refresh
  useEffect(() => {
    const setupAxiosInterceptors = () => {
      const interceptor = axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          console.log("[Auth:Flow] Request failed:", {
            status: error.response?.status,
            url: originalRequest.url,
            hasAuthHeader: !!originalRequest.headers["Authorization"],
          });

          // Only attempt refresh if:
          // 1. Error is 401
          // 2. We haven't tried to refresh yet
          // 3. This isn't the refresh token request itself
          // 4. We have a refresh token cookie
          if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/auth/refresh-token")
          ) {
            originalRequest._retry = true;

            try {
              const response = await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/auth/refresh-token`,
                {},
                {
                  withCredentials: true,
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.data.token) {
                localStorage.setItem("token", response.data.token);
                originalRequest.headers[
                  "Authorization"
                ] = `Bearer ${response.data.token}`;
                axios.defaults.headers.common[
                  "Authorization"
                ] = `Bearer ${response.data.token}`;
                return axios(originalRequest);
              }
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              localStorage.removeItem("token");
              setUser(null);
              navigate("/login");
              return Promise.reject(refreshError);
            }
          }
          return Promise.reject(error);
        }
      );
      return interceptor;
    };

    const interceptor = setupAxiosInterceptors();
    return () => axios.interceptors.response.eject(interceptor);
  }, [navigate]);

  // Check auth state when path changes
  useEffect(() => {
    const checkAuthState = async () => {
      if (pathsRequiringAuth.includes(location.pathname)) {
        setLoading(true);
        try {
          await fetchUserData();
        } catch (error) {
          console.error("Auth state check failed:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuthState();
  }, [location.pathname]);

  // Set up default axios headers
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  const login = async (credentials) => {
    try {
      console.log("[Auth:Client] Starting login request:", {
        baseURL: axios.defaults.baseURL,
        withCredentials: axios.defaults.withCredentials,
        hasAuthHeader: !!axios.defaults.headers.common["Authorization"],
      });

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/login`,
        credentials,
        { withCredentials: true }
      );

      console.log("[Auth:Client] Login response:", {
        hasUser: !!response.data.user,
        hasToken: !!response.data.token,
        tokenFragment: response.data.token
          ? response.data.token.substring(0, 20) + "..."
          : "Missing",
      });

      const { user, token } = response.data;
      localStorage.setItem("token", token);

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setUser(user);
      navigate("/dashboard");
    } catch (error) {
      console.error("[Auth:Client] Login error details:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        hasResponse: !!error.response,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          withCredentials: error.config?.withCredentials,
        },
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
      localStorage.removeItem("token");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("[Auth] Logout error:", error.message);
    }
  };

  const getNewToken = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        return response.data.token;
      }
    } catch (error) {
      console.error("[Auth] Token refresh error:", error.message);
      logout();
      throw error;
    }
  };

  // Update the value object to include all needed functions
  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    getNewToken,
  };

  axios.defaults.withCredentials = true;

  // Add this interceptor
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
