import axios from "axios";

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

export const getToken = async () => {
  let token = localStorage.getItem("accessToken");

  // Check if token exists and is expired
  if (!token || isTokenExpired()) {
    console.log("[AuthUtils] Token expired or missing, refreshing...");
    try {
      const refreshResult = await refreshToken();
      token = refreshResult.accessToken;
    } catch (error) {
      console.error("[AuthUtils] Token refresh failed:", error);
      throw error;
    }
  }

  return token;
};

export const refreshToken = async () => {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        resolve(token);
      });
    });
  }

  isRefreshing = true;

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/auth/refresh_token`,
      {},
      { withCredentials: true }
    );

    const { accessToken, expiresIn } = response.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem(
      "tokenExpiration",
      new Date().getTime() + expiresIn * 1000
    );

    onTokenRefreshed(response.data);
    isRefreshing = false;

    console.log("[AuthUtils] Token refreshed successfully");
    return response.data;
  } catch (error) {
    isRefreshing = false;
    console.error("[AuthUtils] Token refresh failed:", error);
    throw error;
  }
};

export const setupAxiosInterceptors = () => {
  axios.interceptors.request.use(
    async (config) => {
      // Check token expiration before each request
      if (isTokenExpired()) {
        console.log("[AuthUtils] Token expired, refreshing before request");
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
          console.error(
            "[AuthUtils] Token refresh failed in interceptor:",
            refreshError
          );
          // Could add logic here to redirect to login
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
};
