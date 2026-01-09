import React, { useEffect, useContext } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  matchPath,
  Outlet,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ToastProvider } from "./Components/Toast/ToastContext";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BrandProvider } from "./contexts/BrandContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { ChatProvider } from "./contexts/ChatContext";
import {
  NavigationProvider,
  useNavigation,
} from "./contexts/NavigationContext";
import RouteGuard from "./Components/RouteGuard/RouteGuard";
import DashboardNavigation from "./Components/DashboardNavigation/DashboardNavigation";

import Dashboard from "./Components/Dashboard/Dashboard";
import Home from "./Components/Home/Home";
import Login from "./Components/AuthForm/Login/Login";
import Register from "./Components/AuthForm/Register/Register";
import ForgotPassword from "./Components/AuthForm/ForgotPassword/ForgotPassword";
import ResetPassword from "./Components/AuthForm/ResetPassword/ResetPassword";
import EmailVerification from "./Components/EmailVerification/EmailVerification";
import Unsubscribe from "./Components/Unsubscribe/Unsubscribe";
import RegistrationSuccess from "./Components/RegistrationSuccess/RegistrationSuccess";
import GuestCodeSettings from "./Components/GuestCodeSettings/GuestCodeSettings";
import DropFiles from "./Components/DropFiles/DropFiles";
import Locations from "./Components/Locations/Locations";
import BrandProfile from "./Components/BrandProfile/BrandProfile";
import Brands from "./Components/Brands/Brands";
import Events from "./Components/Events/Events";
import EventProfile from "./Components/EventProfile/EventProfile";
import AfterPayment from "./Components/AfterPayment/AfterPayment";
import Settings from "./Components/Settings/Settings";
import PrivacyPolicyPage from "./Components/Legal/PrivacyPolicyPage";
// import DeviceRestriction from "./Components/DeviceRestriction/DeviceRestriction";
import notificationManager from "./utils/notificationManager";
import tokenService from "./utils/tokenService";

// Mobile container to maintain smartphone dimensions on all devices

// Main routing component
const AppRoutes = () => {
  const location = useLocation();
  const { user, loading: authLoading, authInitialized } = useAuth();
  const navigate = useNavigate();

  // Create a simple loading screen component for auth loading
  const AuthLoadingScreen = () => (
    <div className="event-profile-loading">
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    </div>
  );

  // Show loading screen while authentication is initializing
  if (!authInitialized) {
    return <AuthLoadingScreen />;
  }

  // Build user profile path only after user is confirmed
  const userProfilePath = user ? `/@${user.username.trim()}` : null;
  const isBrandProfilePath = /^\/@[a-zA-Z0-9_-]+$/.test(location.pathname);
  const isUserOwnProfilePath =
    userProfilePath && location.pathname === userProfilePath;

  return (
    <Routes>
      {/* Authenticated Routes */}
      {user && userProfilePath && (
        <Route path={userProfilePath}>
          {/* Index route for user dashboard */}
          <Route index element={<Dashboard />} />
          {/* Nested authenticated routes */}
          <Route path="brands" element={<Brands />} />
          <Route path="events" element={<Events />} />
          <Route path="settings" element={<Settings />} />
          <Route path=":brandUsername" element={<BrandProfile />} />
          <Route
            path=":brandUsername/@:eventUsername/:dateSlug"
            element={<EventProfile />}
          />
          <Route
            path=":brandUsername/@:eventUsername"
            element={<EventProfile />}
          />
          {/* Routes with /e/ for backward compatibility */}
          <Route path=":brandUsername/e/:dateSlug" element={<EventProfile />} />
          <Route
            path=":brandUsername/e/:dateSlug/:eventSlug"
            element={<EventProfile />}
          />
          {/* Simplified event route */}
          <Route path=":brandUsername/:dateSlug" element={<EventProfile />} />
        </Route>
      )}

      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/verify/:token" element={<EmailVerification />} />
      <Route path="/verify-email/:token" element={<EmailVerification />} />
      <Route path="/unsubscribe/:codeId" element={<Unsubscribe />} />
      <Route path="/paid" element={<AfterPayment />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />

      {/* Direct Public Brand Profile - Key Fix */}
      <Route
        path="/@:brandUsername"
        element={
          isUserOwnProfilePath ? (
            <Navigate to={userProfilePath} replace />
          ) : (
            <BrandProfile />
          )
        }
      />

      {/* Public Event Profiles */}
      <Route
        path="/@:brandUsername/:dateSlug"
        element={<PublicEventOrBrandProfileWrapper />}
      />
      <Route
        path="/@:brandUsername/@:eventUsername/:dateSlug"
        element={<EventProfile />}
      />
      <Route
        path="/@:brandUsername/@:eventUsername"
        element={<EventProfile />}
      />
      {/* Routes with /e/ for backward compatibility */}
      <Route path="/@:brandUsername/e/:dateSlug" element={<EventProfile />} />
      <Route
        path="/@:brandUsername/e/:dateSlug/:eventSlug"
        element={<EventProfile />}
      />

      {/* Utility Routes (Can be public or private depending on implementation) */}
      <Route path="/guest-code-settings" element={<GuestCodeSettings />} />
      <Route path="/upload" element={<DropFiles showDashboard={false} />} />
      <Route path="/locations" element={<Locations />} />

      {/* Home Route */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={userProfilePath} replace /> // Redirect logged-in users to their dashboard
          ) : (
            <ClearNotificationsOnMount>
              <Home />
            </ClearNotificationsOnMount>
          )
        }
      />

      {/* Fallback Route - Modified from current version */}
      <Route
        path="*"
        element={
          // If logged in, redirect unknown authenticated-like paths to dashboard
          user && location.pathname.startsWith(`/@${user.username.trim()}/`) ? (
            <Navigate to={userProfilePath} replace />
          ) : location.pathname.startsWith("/@") ? (
            // If it's a brand-related path, try to render BrandProfile
            <BrandProfile />
          ) : (
            // Otherwise, redirect to Home
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
};

// Wrapper component for Public Event/Brand Profile to handle conditional logic and hooks correctly
const PublicEventOrBrandProfileWrapper = () => {
  const { user } = useAuth();
  const params = useParams();
  const userProfilePath = user ? `/@${user.username.trim()}` : null;

  // Check if this path matches the logged-in user's potential path
  if (
    user &&
    userProfilePath &&
    `@${user.username.trim()}` === `@${params.brandUsername}`
  ) {
    return <Navigate to={userProfilePath} replace />;
  }

  // Determine if it's an event or brand profile based on dateSlug format
  const isDateFormat = /^\d{6}(-\d+)?$/.test(params.dateSlug);
  return isDateFormat ? <EventProfile /> : <BrandProfile />;
};

// Debug wrapper for routes
const RouteDebug = ({ name, children }) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const debugInfo = {
    name,
    params,
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
    matchResult: matchPath(
      {
        path: location.pathname,
        end: false,
      },
      location.pathname
    ),
    parentMatch: matchPath(
      {
        path: `${location.pathname}/*`,
        end: false,
      },
      location.pathname
    ),
    nestedSegments: location.pathname.split("/").filter(Boolean),
  };

  return typeof children === "function" ? children(debugInfo) : children;
};

// Separate component for user profile route
const UserProfileRoute = () => {
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  return <Outlet />;
};

// Add this component to clear notifications on routes
const ClearNotificationsOnMount = ({ children }) => {
  useEffect(() => {
    notificationManager.clearAllAuthNotifications();
  }, []);

  return children;
};

// Centralized Dashboard Navigation
const CentralizedNavigation = () => {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const { isNavigationOpen, closeNavigation } = useNavigation();

  // If no user or closed navigation, don't render
  if (!user || !isNavigationOpen) return null;

  return (
    <DashboardNavigation
      isOpen={isNavigationOpen}
      onClose={closeNavigation}
      currentUser={user}
      setUser={setUser}
    />
  );
};

// Main App component
function App() {
  return (
    <AuthProvider>
      <BrandProvider>
        <SocketProvider>
          <ChatProvider>
            <NotificationProvider>
              <NavigationProvider>
                <Toaster position="top-center" />
                <ToastProvider>
                  <AppRoutes />
                  <CentralizedNavigation />
                </ToastProvider>
              </NavigationProvider>
            </NotificationProvider>
          </ChatProvider>
        </SocketProvider>
      </BrandProvider>
    </AuthProvider>
  );
}

export default App;
