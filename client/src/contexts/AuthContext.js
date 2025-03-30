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
    // Skip if auth isn't initialized yet
    if (!authInitialized) return;

    // Skip redundant checks by tracking the last checked path
    const lastCheckedPath = sessionStorage.getItem("last-auth-check-path");
    if (lastCheckedPath === location.pathname) {
      return;
    }

    const checkAuthState = async () => {
      // Store the path we're currently checking
      sessionStorage.setItem("last-auth-check-path", location.pathname);

      // Handle ambiguous @username routes that might be dashboard or brand profile
      const isAmbiguousRoute =
        location.pathname.startsWith("/@") &&
        !location.pathname.includes("/e/") &&
        !/\d{6}/.test(location.pathname);

      // Determine if this route needs authentication
      const requiresAuth = pathsRequiringAuth.some((path) => {
        // Convert path params to regex parts
        const regexPath = path.replace(/:\w+/g, "[^/]+");
        return new RegExp(`^${regexPath}$`).test(location.pathname);
      });

      // Skip auth check for EventProfile routes - these are public pages
      const isEventProfileRoute =
        location.pathname.includes("/@") && /\d{6}/.test(location.pathname); // Contains a date pattern like 033025

      if (isEventProfileRoute) {
        console.log(
          "[AuthContext] Skipping auth check for public EventProfile route:",
          location.pathname
        );
        return; // Skip the auth check completely
      }

      // For ambiguous routes or routes requiring auth, check authentication
      if (isAmbiguousRoute || requiresAuth) {
        setLoading(true);
        const token = tokenService.getToken();

        // Only compute these values if needed
        let currentUsername = null;
        let routeUsername = null;
        let isPotentialDashboard = false;

        if (isAmbiguousRoute) {
          currentUsername = user?.username;
          routeUsername = location.pathname.startsWith("/@")
            ? location.pathname.substring(2).split("/")[0]
            : null;

          // Check if this might be the user's dashboard based on URL pattern
          isPotentialDashboard =
            routeUsername &&
            currentUsername &&
            routeUsername.toLowerCase() === currentUsername.toLowerCase();
        }

        // If no token or token is expired/near expiry
        if (!token || tokenService.isTokenExpiredOrNearExpiry(token)) {
          try {
            await tokenService.refreshToken();
            await fetchUserData();
          } catch (error) {
            console.log(
              "[AuthContext] Auth failed on route:",
              location.pathname
            );

            // If this is potentially the user's dashboard or requires auth, redirect to login
            if (isPotentialDashboard || requiresAuth) {
              console.log(
                "[AuthContext] Redirecting from potential dashboard to login"
              );
              navigate("/login", {
                state: {
                  from: isPotentialDashboard
                    ? `/@${currentUsername}`
                    : location.pathname,
                  message: "Your session has expired. Please login again.",
                },
              });
            }
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
              console.log(
                "[AuthContext] Auth refresh failed on route:",
                location.pathname
              );

              // If this is potentially the user's dashboard or requires auth, redirect to login
              if (isPotentialDashboard || requiresAuth) {
                console.log(
                  "[AuthContext] Redirecting from potential dashboard to login after refresh failure"
                );
                navigate("/login", {
                  state: {
                    from: isPotentialDashboard
                      ? `/@${currentUsername}`
                      : location.pathname,
                    message: "Your session has expired. Please login again.",
                  },
                });
              }
            }
          }
        }

        setLoading(false);
      }
    };

    checkAuthState();
  }, [location.pathname, authInitialized, navigate]);

  // Handle auth:required events (session expiration)
  useEffect(() => {
    // Handler for auth:required events (session expired)
    const handleAuthRequired = (event) => {
      console.log("[AuthContext] Auth required event:", event.detail);
      const { message, redirectUrl } = event.detail;

      // Set auth state to logged out
      setUser(null);

      // Clear any stored tokens
      tokenService.clearTokens();

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

  // Add heartbeat ping to detect mobile browser issues
  useEffect(() => {
    if (user) {
      // Set up heartbeat to check token validity
      const heartbeatInterval = setInterval(async () => {
        try {
          // Try to refresh token to maintain session
          // Just update the wasAuthenticated flag without causing state changes
          // Don't await on the ping as it may cause re-renders
          localStorage.setItem("wasAuthenticated", "true");

          // Don't call pingSession here as it may trigger state updates
          // instead use a direct check against expiry
          const token = tokenService.getToken();
          if (token && tokenService.isTokenExpiredOrNearExpiry(token)) {
            try {
              await tokenService.refreshToken();
            } catch (error) {
              console.log(
                "[AuthContext] Token refresh in heartbeat failed:",
                error
              );
              // Don't trigger any state changes here
            }
          }
        } catch (error) {
          console.log("[AuthContext] Heartbeat check failed:", error);
          // Don't do anything that would trigger state changes
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(heartbeatInterval);
    }
  }, [user?._id]); // Only depend on user ID, not the entire user object

  // Define our custom user setter that updates local state
  const setUserWithRedux = (userData) => {
    setUser(userData);
    // Set a flag in localStorage to indicate the user was authenticated
    if (userData) {
      localStorage.setItem("wasAuthenticated", "true");
    } else {
      localStorage.removeItem("wasAuthenticated");
    }
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

      // Set a flag in localStorage that user was authenticated
      localStorage.setItem("wasAuthenticated", "true");

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

      // Clean up authentication flag
      localStorage.removeItem("wasAuthenticated");

      setUser(null);
      setLoading(false);
      navigate("/login");
    } catch (error) {
      // Even on error, clean up tokens and navigate to login
      tokenService.clearTokens();
      tokenService.cleanup();

      // Clean up authentication flag
      localStorage.removeItem("wasAuthenticated");

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
