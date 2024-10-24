import React, { createContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const AuthContext = createContext();

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

          // Only attempt refresh if:
          // 1. Error is 401
          // 2. We haven't tried to refresh yet
          // 3. This isn't the refresh token request itself
          // 4. We have a refresh token cookie
          if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/auth/refresh_token")
          ) {
            originalRequest._retry = true;

            try {
              const response = await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/auth/refresh_token`,
                {},
                {
                  withCredentials: true,
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.data.accessToken) {
                localStorage.setItem("token", response.data.accessToken);

                // Update authorization header
                originalRequest.headers[
                  "Authorization"
                ] = `Bearer ${response.data.accessToken}`;

                // Update default axios header for subsequent requests
                axios.defaults.headers.common[
                  "Authorization"
                ] = `Bearer ${response.data.accessToken}`;

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

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
