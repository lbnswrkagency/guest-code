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
    // "/login",
    "/register",
    "/registration-success",
    "/verify/:token",
  ];

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/auth/user`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const setupAxiosInterceptors = () => {
      const interceptor = axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/auth/refresh_token")
          ) {
            originalRequest._retry = true;
            try {
              const response = await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/auth/refresh_token`,
                {}, // Empty data object, as this POST doesn't require data
                { withCredentials: true } // This is the correct place for withCredentials
              );

              const { accessToken } = response.data;
              localStorage.setItem("token", accessToken);
              originalRequest.headers[
                "Authorization"
              ] = `Bearer ${accessToken}`;
              return axios(originalRequest);
            } catch (refreshError) {
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

  useEffect(() => {
    if (pathsRequiringAuth.includes(location.pathname)) {
      setLoading(true);
      fetchUserData().finally(() => setLoading(false));
    }
  }, [location.pathname]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
