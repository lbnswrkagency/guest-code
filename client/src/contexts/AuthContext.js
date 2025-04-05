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

  // Add initial auth check only once at startup
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        // Try to load user data - cookies will be sent automatically
        const userData = await fetchUserData();
        setAuthInitialized(true);
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setUser(null);
        setAuthInitialized(true);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for auth:required events (session expiration)
  useEffect(() => {
    // Handler for auth:required events (session expired)
    const handleAuthRequired = (event) => {
      console.log("[AuthContext] Auth required event:", event.detail);
      const { message, redirectUrl } = event.detail;

      // Set auth state to logged out
      setUser(null);

      // Navigate to login with error message and intended redirect
      if (navigate) {
        navigate("/login", {
          state: {
            message: message || "Your session has expired. Please login again.",
            from: redirectUrl || "/",
          },
          replace: true, // Replace current history entry to prevent back button issues
        });
      }
    };

    // Listen for auth events
    window.addEventListener("auth:required", handleAuthRequired);

    // Cleanup listener on unmount
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

  // Add visibility change handler to refresh user data when app comes to foreground
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && user) {
        console.log(
          "[AuthContext] App came to foreground, refreshing user data"
        );
        // Silently refresh user data when app comes to foreground
        try {
          await fetchUserData();
        } catch (error) {
          console.error(
            "[AuthContext] Error refreshing data on visibility change:",
            error
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  const login = async (credentials) => {
    try {
      setLoading(true);

      const response = await axiosInstance.post("/auth/login", credentials);

      // Cookies are automatically handled by the browser
      // We don't need to manually store tokens anymore

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
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // Use tokenService.logout which handles the API call and cleanup
      await tokenService.logout();

      setUser(null);
      setLoading(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Even on error, clean up state
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
