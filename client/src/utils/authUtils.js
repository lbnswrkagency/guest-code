import axios from "axios";
import axiosInstance from "./axiosConfig";

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);

const onTokenRefreshed = (token) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

// Add token expiration check
const isTokenExpired = () => {
  const expiration = localStorage.getItem("tokenExpiration");
  if (!expiration) return true;

  // Add 10-second buffer to prevent edge cases
  return new Date().getTime() > parseInt(expiration) - 10000;
};

export const getToken = () => {
  // Get token from cookie
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];

  return token;
};

export const refreshToken = async () => {
  try {
    const response = await axiosInstance.post("/auth/refresh-token");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const setupAxiosInterceptors = () => {
  axios.interceptors.request.use(
    async (config) => {
      // Check token expiration before each request
      if (isTokenExpired()) {
        await refreshToken();
      }

      const token = await getToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const { accessToken } = await refreshToken();
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Could add logic here to redirect to login
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
};
