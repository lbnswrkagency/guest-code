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
    "/register",
    "/registration-success",
    "/verify/:token",
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

  // Add initial auth check with token refresh if needed
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const token = tokenService.getToken();

      if (token) {
        try {
          // Ensure we have a fresh token
          if (tokenService.isTokenExpiredOrNearExpiry(token)) {
            await tokenService.refreshToken();
          }

          await fetchUserData();
        } catch (error) {
          console.error("Failed to initialize auth:", error);
          setUser(null);
        }
      }

      setLoading(false);
      setAuthInitialized(true);
    };

    initializeAuth();
  }, []);

  // Check auth state when path changes
  useEffect(() => {
    const checkAuthState = async () => {
      // Determine if this route needs authentication
      const requiresAuth = pathsRequiringAuth.some((path) => {
        // Convert path params to regex parts
        const regexPath = path.replace(/:\w+/g, "[^/]+");
        return new RegExp(`^${regexPath}$`).test(location.pathname);
      });

      if (requiresAuth) {
        setLoading(true);
        const token = tokenService.getToken();

        // If no token or token is expired/near expiry
        if (!token || tokenService.isTokenExpiredOrNearExpiry(token)) {
          try {
            await tokenService.refreshToken();
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
              await tokenService.refreshToken();
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
  }, [location.pathname, authInitialized, navigate, location]);

  // Listen for auth:required events to handle auth failures across the app
  useEffect(() => {
    const handleAuthRequired = (event) => {
      // Clear the user data
      setUser(null);

      // Get the redirect URL from the event detail
      const redirectUrl = event.detail?.redirectUrl || "/login";

      // Navigate to login with the current location as the 'from' state
      navigate("/login", {
        state: {
          from: redirectUrl,
          message: event.detail?.message,
        },
      });
    };

    // Add event listener
    window.addEventListener("auth:required", handleAuthRequired);

    // Cleanup
    return () => {
      window.removeEventListener("auth:required", handleAuthRequired);
    };
  }, [navigate]);

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

      // Process token and user data
      const token = response.data.token;
      const refreshToken = response.data.refreshToken;

      // Store tokens using token service
      tokenService.setToken(token);
      tokenService.setRefreshToken(refreshToken);

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

      setUser(userData);
      setLoading(false);

      // Return the full user data object
      return userData;
    } catch (error) {
      // Clear tokens on login failure
      tokenService.clearTokens();
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // Call logout endpoint
      await axiosInstance.post("/auth/logout");

      // Clean up token service and state
      tokenService.clearTokens();
      tokenService.cleanup();

      setUser(null);
      setLoading(false);
      navigate("/login");
    } catch (error) {
      // Even on error, clean up tokens and navigate to login
      tokenService.clearTokens();
      tokenService.cleanup();
      setUser(null);
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
    refreshToken: tokenService.refreshToken.bind(tokenService), // Use token service
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Outer provider that doesn't use router hooks
export const AuthProvider = ({ children }) => {
  return <AuthProviderWithRouter>{children}</AuthProviderWithRouter>;
};

export default AuthContext;
