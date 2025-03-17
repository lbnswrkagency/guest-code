import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosConfig";
import { cleanUsername } from "../utils/stringUtils";
import { useDispatch } from "react-redux";
import { setUser as setReduxUser, clearUser } from "../redux/userSlice";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Function to decode JWT and check if it's expired
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    // Extract the payload from JWT (second part between dots)
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));

    // Check expiration (exp is in seconds, Date.now() is in milliseconds)
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // If there's any error, consider the token expired
  }
};

// Inner provider that uses router hooks
const AuthProviderWithRouter = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshPromise, setRefreshPromise] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  const refreshToken = async () => {
    try {
      const response = await axiosInstance.post("/auth/refresh-token");

      // Update localStorage with new tokens
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("refreshToken", response.data.refreshToken);

      // Update axios headers
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${response.data.token}`;

      return response.data;
    } catch (error) {
      // Clear tokens on refresh failure
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      throw error;
    }
  };

  // Centralized refresh handling to avoid multiple simultaneous refresh attempts
  const handleTokenRefresh = async () => {
    // If already refreshing, return the existing promise
    if (refreshPromise) {
      return refreshPromise;
    }

    // Create a new refresh promise
    const newRefreshPromise = refreshToken().finally(() => {
      // Clear the promise reference when done
      setRefreshPromise(null);
      setIsRefreshing(false);
    });

    // Store the promise so other requests can use it
    setRefreshPromise(newRefreshPromise);
    setIsRefreshing(true);

    return newRefreshPromise;
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/auth/user");
      if (response.data) {
        // Clean the username when fetching user data
        const userData = {
          ...response.data,
          username: cleanUsername(response.data.username),
        };

        // Set the updated user data
        setUser(userData);
        return userData;
      }
      return null;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add initial auth check with token refresh if needed
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (token) {
        // Set auth header for initial requests
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;

        // Check if token is expired and try to refresh it
        if (isTokenExpired(token)) {
          try {
            console.log("Token expired on page load, attempting refresh");
            await handleTokenRefresh();
            await fetchUserData();
          } catch (refreshError) {
            console.error("Token refresh failed on page load:", refreshError);
            // Clear user state but don't redirect yet
            setUser(null);
          }
        } else {
          try {
            // Token is still valid, just fetch the user data
            await fetchUserData();
          } catch (error) {
            console.error("Failed to fetch user data with valid token:", error);
            // Try to refresh token as a fallback
            try {
              await handleTokenRefresh();
              await fetchUserData();
            } catch (refreshError) {
              console.error("Fallback token refresh failed:", refreshError);
              setUser(null);
            }
          }
        }
      }

      setLoading(false);
      setAuthInitialized(true);
    };

    initializeAuth();
  }, []);

  // Setup axios interceptor for token refresh
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Skip if the request is the refresh token request itself or already retried
        if (
          originalRequest.url?.includes("/auth/refresh-token") ||
          originalRequest._retry
        ) {
          return Promise.reject(error);
        }

        // Handle unauthorized errors (401)
        if (error.response?.status === 401) {
          originalRequest._retry = true;

          try {
            // Use centralized refresh handling
            await handleTokenRefresh();

            // Clone the original request
            const newRequest = {
              ...originalRequest,
              headers: {
                ...originalRequest.headers,
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            };

            // Retry the original request with new token
            return axiosInstance(newRequest);
          } catch (refreshError) {
            console.error("Token refresh failed in interceptor:", refreshError);
            setUser(null);

            // Only redirect if on a protected route
            if (
              pathsRequiringAuth.some((path) => {
                // Convert path params to regex parts
                const regexPath = path.replace(/:\w+/g, "[^/]+");
                return new RegExp(`^${regexPath}$`).test(location.pathname);
              })
            ) {
              navigate("/login", { state: { from: location } });
            }

            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Set up periodic token refresh (every 14 minutes)
    const refreshTimeout = setInterval(async () => {
      const token = localStorage.getItem("token");
      if (token && user) {
        // Check if token is close to expiry (80% of lifetime passed)
        if (isTokenExpired(token) || isTokenNearExpiry(token)) {
          try {
            console.log("Performing scheduled token refresh");
            await handleTokenRefresh();
          } catch (error) {
            console.error("Scheduled token refresh failed:", error);
          }
        }
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
      clearInterval(refreshTimeout);
    };
  }, [navigate, location, user, isRefreshing]);

  // Helper function to check if token is close to expiry
  const isTokenNearExpiry = (token) => {
    if (!token) return true;

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(base64));

      // Check if token is within 80% of its lifetime
      const expiryTime = payload.exp * 1000;
      const issuedAt = payload.iat * 1000;
      const tokenLifetime = expiryTime - issuedAt;
      const timeUntilExpiry = expiryTime - Date.now();

      return timeUntilExpiry < tokenLifetime * 0.2; // 20% of lifetime left
    } catch (error) {
      return true;
    }
  };

  // Check auth state when path changes
  useEffect(() => {
    const checkAuthState = async () => {
      if (
        pathsRequiringAuth.some((path) => {
          // Convert path params to regex parts
          const regexPath = path.replace(/:\w+/g, "[^/]+");
          return new RegExp(`^${regexPath}$`).test(location.pathname);
        })
      ) {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token || isTokenExpired(token)) {
          try {
            await handleTokenRefresh();
            await fetchUserData();
          } catch (error) {
            navigate("/login", { state: { from: location } });
          }
        } else {
          try {
            await fetchUserData();
          } catch (error) {
            // If fetching fails with a valid token, try refreshing
            try {
              await handleTokenRefresh();
              await fetchUserData();
            } catch (refreshError) {
              navigate("/login", { state: { from: location } });
            }
          }
        }

        setLoading(false);
      }
    };

    if (authInitialized) {
      checkAuthState();
    }
  }, [location.pathname, authInitialized]);

  // Sync user state with Redux when user changes
  useEffect(() => {
    // Only dispatch if user exists to prevent unnecessary actions
    if (user) {
      // Ensure all user properties from the User model are passed to Redux
      dispatch(
        setReduxUser({
          ...user, // Keep all original properties

          // Make sure these critical fields are included explicitly
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          birthday: user.birthday,

          // Permission flags
          isVerified: user.isVerified || false,
          isAdmin: user.isAdmin || false,
          isScanner: user.isScanner || false,
          isPromoter: user.isPromoter || false,
          isStaff: user.isStaff || false,
          isDeveloper: user.isDeveloper || false,
          isBackstage: user.isBackstage || false,
          isSpitixBattle: user.isSpitixBattle || false,
          isTable: user.isTable || false,
          isAlpha: user.isAlpha || false,

          // Avatar (all paths)
          avatar: user.avatar || null,

          // Events and timestamps
          events: user.events || [],
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLogin: user.lastLogin,

          // Metadata for Redux tracking
          lastSyncedAt: new Date().toISOString(),
        })
      );
    } else if (authInitialized) {
      // Only clear if we're past initialization
      dispatch(clearUser());
    }
  }, [user, dispatch, authInitialized]);

  // Define our custom user setter that updates local state
  const setUserWithRedux = (userData) => {
    setUser(userData);
    // Redux sync is handled by the useEffect above
  };

  const login = async (credentials) => {
    try {
      setLoading(true);

      const response = await axiosInstance.post("/auth/login", credentials);

      // Prepare the user data object
      let userData = null;

      // Clean the username when logging in
      if (response.data.user) {
        userData = {
          ...response.data.user,
          username: cleanUsername(response.data.user.username),
          // Ensure brands are included if they exist
          brands: response.data.user.brands || [],
        };
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("refreshToken", response.data.refreshToken);

      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${response.data.token}`;

      setUser(userData);
      setLoading(false);

      navigate(`/@${userData.username}`);

      // Return the full user data object
      return userData;
    } catch (error) {
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
      delete axiosInstance.defaults.headers.common["Authorization"];

      setUser(null);
      setLoading(false);
      navigate("/login");
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      delete axiosInstance.defaults.headers.common["Authorization"];
      setUser(null);
      setLoading(false);
      navigate("/login");
    }
  };

  const value = {
    user,
    setUser: setUserWithRedux, // Use our enhanced setter
    loading,
    authInitialized,
    login,
    logout,
    fetchUserData,
    refreshToken: handleTokenRefresh, // Expose the refresh function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Outer provider that doesn't use router hooks
export const AuthProvider = ({ children }) => {
  return <AuthProviderWithRouter>{children}</AuthProviderWithRouter>;
};

export default AuthContext;
