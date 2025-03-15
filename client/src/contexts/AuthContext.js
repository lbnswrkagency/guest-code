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

// Inner provider that uses router hooks
const AuthProviderWithRouter = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    setUser: setUserWithRedux, // Use our enhanced setter
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
