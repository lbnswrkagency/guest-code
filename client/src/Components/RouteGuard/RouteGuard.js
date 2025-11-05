import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const RouteGuard = ({ children }) => {
  const { user, loading, authInitialized, refreshToken } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // List of paths that require authentication
  const protectedPaths = [
    "/dashboard",
    "/events/create",
    "/settings",
    "/roles",
    "/guest-code-settings",
  ];

  // Check if the current path is protected
  const isProtectedPath = () => {
    // Check if path starts with user profile pattern /@username but is not a brand profile
    if (location.pathname.startsWith("/@") && user) {
      const userProfilePath = `/@${user.username}`;
      // Check if this path starts with user's own profile path
      return location.pathname.startsWith(userProfilePath);
    }

    // Check against explicit protected paths
    return protectedPaths.some((path) => location.pathname.startsWith(path));
  };

  useEffect(() => {
    const checkAuthAndRoute = async () => {
      // Skip check until auth is initialized and not in loading state
      if (!authInitialized || loading) {
        return;
      }

      const needsAuth = isProtectedPath();

      setIsChecking(true);

      if (needsAuth && !user) {
        // Try to refresh token if accessing protected route without user
        try {
          console.log("Protected route detected, attempting token refresh");
          await refreshToken();
          // If refresh succeeds but still no user, redirect to login
          if (!user) {
            navigate("/login", { state: { from: location } });
          }
        } catch (error) {
          console.error("Token refresh failed in RouteGuard:", error);
          navigate("/login", { state: { from: location } });
        }
      }

      setIsChecking(false);
    };

    checkAuthAndRoute();
  }, [location.pathname, user, authInitialized, loading]);

  // Show nothing while checking auth state or loading
  if (!authInitialized || loading || isChecking) {
    return null;
  }

  // Once auth is checked, render children
  return <>{children}</>;
};

export default RouteGuard;
