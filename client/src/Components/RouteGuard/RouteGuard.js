import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingScreen from "../LoadingScreen/LoadingScreen";

const RouteGuard = ({ children }) => {
  const { user, loading: authLoading, authInitialized } = useAuth();
  const [routingReady, setRoutingReady] = useState(false);
  const location = useLocation();
  const params = useParams();

  // Ensure authentication state is fully resolved before making routing decisions
  useEffect(() => {
    if (authInitialized && !authLoading) {
      // Add a small delay to ensure all auth-related state is properly updated
      const timer = setTimeout(() => {
        setRoutingReady(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [authLoading, authInitialized, user]);

  // Log the current state for debugging
  useEffect(() => {
    console.log("[RouteGuard] Auth state:", {
      authInitialized,
      authLoading,
      routingReady,
      user: user ? `@${user.username}` : "null",
      path: location.pathname,
      timestamp: new Date().toISOString(),
    });
  }, [authInitialized, authLoading, routingReady, user, location.pathname]);

  // Show loading screen while authentication is being determined
  if (!routingReady) {
    return <LoadingScreen />;
  }

  // Once authentication is confirmed, render the children (routes)
  return children;
};

export default RouteGuard;
