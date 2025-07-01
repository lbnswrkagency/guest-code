import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosConfig";
import tokenService from "../utils/tokenService";
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
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const pathsRequiringAuth = [
    "/dashboard",
    "/events",
    "/events/create",
    "/events/:eventId",
    "/guest-code-settings",
  ];

  // Function to fetch user data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Ensure token is fresh before fetching user data
      await tokenService.ensureFreshToken();

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

  // Initial auth check on app load
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const token = tokenService.getToken();
      const refreshTokenExists = !!tokenService.getRefreshToken();

      if (token) {
        try {
          // Verify token validity by fetching user data
          // If token is invalid/expired, interceptor will handle refresh or logout
          await fetchUserData();
        } catch (error) {
          // Error handled within fetchUserData or by interceptor
          // setUser(null) should have been called
        }
      } else if (refreshTokenExists) {
        // If no access token but refresh token exists, try refreshing
        try {
          await tokenService.refreshToken();
          await fetchUserData(); // Fetch user data after successful refresh
        } catch (error) {
          console.error("[AuthContext] Initial refresh failed:", error);
          
          // Only clear tokens if it's actually an auth error, not a network error
          if (error.response?.status === 401) {
            console.log("[AuthContext] Refresh token expired, clearing tokens");
            setUser(null);
            tokenService.clearTokens();
          } else if (!error.response || error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR') {
            console.log("[AuthContext] Network error during initial refresh, retrying later");
            // Keep tokens for retry later, but don't set user as authenticated
            setUser(null);
          } else {
            // Other errors - clear tokens
            setUser(null);
            tokenService.clearTokens();
          }
        }
      } else {
        // No tokens exist
        setUser(null);
      }

      setAuthInitialized(true); // Mark auth as initialized
      setLoading(false); // Finish loading
    };

    initializeAuth();
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle auth:required events (session expiration)
  useEffect(() => {
    const handleAuthRequired = (event) => {
      console.log("[AuthContext] Auth required event received:", event.detail);
      const { message, redirectUrl } = event.detail || {};

      setUser(null); // Clear user state
      dispatch(clearUser()); // Clear redux state
      tokenService.clearTokens(); // Clear tokens

      // Navigate to login
      if (navigate) {
        navigate("/login", {
          state: {
            message: message || "Your session has expired. Please login again.",
            // Use current location as 'from' unless a specific one was provided
            from: redirectUrl || location.pathname,
          },
          replace: true,
        });
      }
    };

    window.addEventListener("auth:required", handleAuthRequired);
    return () => {
      window.removeEventListener("auth:required", handleAuthRequired);
    };
    // Ensure navigate and location are stable dependencies if needed, but usually okay
  }, [navigate, location, dispatch]);

  // Sync user state with Redux when user changes
  useEffect(() => {
    if (user) {
      dispatch(
        setReduxUser({
          ...user,
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          birthday: user.birthday,
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
          avatar: user.avatar || null,
          events: user.events || [],
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLogin: user.lastLogin,
          lastSyncedAt: new Date().toISOString(),
        })
      );
    } else if (authInitialized) {
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

      const token = response.data.token;
      const refreshToken = response.data.refreshToken;

      tokenService.setToken(token);
      tokenService.setRefreshToken(refreshToken);

      let userData = null;
      if (response.data.user) {
        userData = {
          ...response.data.user,
          username: cleanUsername(response.data.user.username),
          brands: response.data.user.brands || [],
        };
      }

      setUser(userData); // Update local state
      setLoading(false);
      return userData;
    } catch (error) {
      tokenService.clearTokens();
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // Optional: Inform the backend about logout
      try {
        await axiosInstance.post("/auth/logout");
      } catch (logoutError) {
        console.warn("[AuthContext] Backend logout call failed:", logoutError);
        // Proceed with client-side logout anyway
      }

      tokenService.clearTokens();
      setUser(null);
      dispatch(clearUser()); // Ensure Redux is cleared
      setLoading(false);
      navigate("/login");
    } catch (error) {
      // Ensure cleanup even if logout call fails
      tokenService.clearTokens();
      setUser(null);
      dispatch(clearUser());
      setLoading(false);
      navigate("/login");
    }
  };

  const value = {
    user,
    setUser: setUserWithRedux,
    loading,
    authInitialized,
    login,
    logout,
    fetchUserData,
    refreshToken: tokenService.refreshToken.bind(tokenService),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Outer provider that doesn't use router hooks
export const AuthProvider = ({ children }) => {
  return <AuthProviderWithRouter>{children}</AuthProviderWithRouter>;
};

export default AuthContext;
