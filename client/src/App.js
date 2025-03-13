import React from "react";
import {
  BrowserRouter as Router,
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
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { ChatProvider } from "./contexts/ChatContext";
import RouteGuard from "./Components/RouteGuard/RouteGuard";

import Dashboard from "./Components/Dashboard/Dashboard";
import Home from "./Components/Home/Home";
import Login from "./Components/AuthForm/Login/Login";
import Register from "./Components/AuthForm/Register/Register";
import EmailVerification from "./Components/EmailVerification/EmailVerification";
import RegistrationSuccess from "./Components/RegistrationSuccess/RegistrationSuccess";
import GuestCodeSettings from "./Components/GuestCodeSettings/GuestCodeSettings";
import DropFiles from "./Components/DropFiles/DropFiles";
import Locations from "./Components/Locations/Locations";
import BrandProfile from "./Components/BrandProfile/BrandProfile";
import Brands from "./Components/Brands/Brands";
import Events from "./Components/Events/Events";
import EventProfile from "./Components/EventProfile/EventProfile";
import AfterPayment from "./Components/AfterPayment/AfterPayment";
import DeviceRestriction from "./Components/DeviceRestriction/DeviceRestriction";

// Main routing component
const AppRoutes = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const params = useParams();

  // Pre-build the user profile route if we have a user
  const userProfilePath = user ? `/@${user.username.trim()}` : null;

  // Check if the current path matches the brand profile pattern
  const isBrandProfilePath = /^\/@[a-zA-Z0-9_-]+$/.test(location.pathname);

  // Check if the path starts with /@ to handle all brand-related routes
  const isBrandRelatedPath = location.pathname.startsWith("/@");

  // Check if this is the user's own profile path
  const isUserOwnProfilePath =
    userProfilePath && location.pathname === userProfilePath;

  return (
    <Routes>
      {/* Special case for brand profile path - but only if it's not the user's own profile */}
      {isBrandProfilePath && !isUserOwnProfilePath && (
        <Route
          path={location.pathname}
          element={
            <RouteDebug name="brand-profile-direct-match">
              {({ params }) => {
                // Extract the brand username from the path
                const brandUsername = location.pathname.substring(2); // Remove the leading /@
                return <BrandProfile key={brandUsername} />;
              }}
            </RouteDebug>
          }
        />
      )}

      {user ? (
        <>
          {/* User's own profile route - this should take precedence over brand routes */}
          <Route
            path={userProfilePath}
            element={
              <RouteDebug name="user-own-profile">
                {({ params }) => {
                  return <Dashboard />;
                }}
              </RouteDebug>
            }
          />

          <Route
            path={`${userProfilePath}/*`}
            element={
              <Routes>
                <Route
                  index
                  element={
                    <RouteDebug name="user-profile-index">
                      <Dashboard />
                    </RouteDebug>
                  }
                />
                <Route
                  path="brands"
                  element={
                    <RouteDebug name="user-brands">
                      <Brands />
                    </RouteDebug>
                  }
                />
                <Route
                  path="events"
                  element={
                    <RouteDebug name="user-events">
                      <Events />
                    </RouteDebug>
                  }
                />
                <Route
                  path=":brandUsername"
                  element={
                    <RouteDebug name="brand-profile-auth">
                      {({ params }) => {
                        return <BrandProfile />;
                      }}
                    </RouteDebug>
                  }
                />
                <Route
                  path=":brandUsername/:eventUsername/:dateSlug"
                  element={
                    <RouteDebug name="event-auth-special-format">
                      {({ params }) => {
                        // Always use EventProfile for this pattern
                        return <EventProfile />;
                      }}
                    </RouteDebug>
                  }
                />
                <Route
                  path=":brandUsername/:eventUsername"
                  element={
                    <RouteDebug name="event-auth">
                      {({ params }) => {
                        return <EventProfile />;
                      }}
                    </RouteDebug>
                  }
                />
                {/* Routes with /e/ for backward compatibility */}
                <Route
                  path=":brandUsername/e/:dateSlug"
                  element={
                    <RouteDebug name="event-auth-simple-format">
                      {({ params }) => {
                        return <EventProfile />;
                      }}
                    </RouteDebug>
                  }
                />
                <Route
                  path=":brandUsername/e/:dateSlug/:eventSlug"
                  element={
                    <RouteDebug name="event-auth-new-format">
                      {({ params }) => {
                        return <EventProfile />;
                      }}
                    </RouteDebug>
                  }
                />
                {/* New simplified route for events with format /@username/@brandusername/MMDDYY */}
                <Route
                  path=":brandUsername/:dateSlug"
                  element={
                    <RouteDebug name="event-auth-simplified-format">
                      {({ params }) => {
                        // We need to check if dateSlug is a valid date format to avoid mismatching
                        const isDateFormat = /^\d{6}(-\d+)?$/.test(
                          params.dateSlug
                        );

                        if (isDateFormat) {
                          return <EventProfile />;
                        } else {
                          // If it's not a date format, use EventProfile anyway to avoid errors
                          return <EventProfile />;
                        }
                      }}
                    </RouteDebug>
                  }
                />
                <Route
                  path={`${userProfilePath}/:brandUsername/@:eventUsername/:dateSlug`}
                  element={
                    <RouteDebug name="event-auth-special-direct-format">
                      {({ params }) => {
                        return <EventProfile />;
                      }}
                    </RouteDebug>
                  }
                />
              </Routes>
            }
          />
        </>
      ) : (
        <>
          {/* Empty placeholder - all public routes are now defined outside the conditional */}
        </>
      )}

      {/* Brand profile routes - MUST be before the catch-all route */}
      <Route
        path="/@:brandUsername"
        element={
          <RouteDebug name="brand-profile-public">
            {({ params }) => {
              return <BrandProfile />;
            }}
          </RouteDebug>
        }
      />

      {/* Public route for /@brandusername/YYXXZZ format */}
      <Route
        path="/@:brandUsername/:dateSlug"
        element={
          <RouteDebug name="event-public-ultra-simplified">
            {({ params }) => {
              // We need to check if dateSlug is a valid date format to avoid mismatching
              const isDateFormat = /^\d{6}(-\d+)?$/.test(params.dateSlug);

              if (isDateFormat) {
                return <EventProfile />;
              } else {
                // If it's not a date format, it might be another type of route
                // Instead of redirecting, we should show the BrandProfile
                return <BrandProfile />;
              }
            }}
          </RouteDebug>
        }
      />

      {/* Additional public routes */}
      <Route
        path="/@:brandUsername/@:eventUsername/:dateSlug"
        element={
          <RouteDebug name="event-public-special-format">
            {({ params }) => {
              // Always use EventProfile for this pattern
              return <EventProfile />;
            }}
          </RouteDebug>
        }
      />

      <Route
        path="/@:brandUsername/@:eventUsername"
        element={
          <RouteDebug name="event-public">
            {({ params }) => {
              return <EventProfile />;
            }}
          </RouteDebug>
        }
      />

      {/* Routes with /e/ for backward compatibility */}
      <Route
        path="/@:brandUsername/e/:dateSlug"
        element={
          <RouteDebug name="event-public-simple-format">
            {({ params }) => {
              return <EventProfile />;
            }}
          </RouteDebug>
        }
      />

      <Route
        path="/@:brandUsername/e/:dateSlug/:eventSlug"
        element={
          <RouteDebug name="event-public-new-format">
            {({ params }) => {
              return <EventProfile />;
            }}
          </RouteDebug>
        }
      />

      {/* Specific routes */}
      <Route
        path="/login"
        element={
          <RouteDebug name="login">
            <Login />
          </RouteDebug>
        }
      />
      <Route
        path="/register"
        element={
          <RouteDebug name="register">
            <Register />
          </RouteDebug>
        }
      />
      <Route
        path="/registration-success"
        element={
          <RouteDebug name="registration-success">
            <RegistrationSuccess />
          </RouteDebug>
        }
      />
      <Route
        path="/verify/:token"
        element={
          <RouteDebug name="verify">
            <EmailVerification />
          </RouteDebug>
        }
      />

      {/* Event Profile Route - keep for backward compatibility */}
      <Route
        path="/events/:eventId"
        element={
          <RouteDebug name="event-profile">
            <EventProfile />
          </RouteDebug>
        }
      />

      {/* Utility routes */}
      <Route
        path="/guest-code-settings"
        element={
          <RouteDebug name="guest-code-settings">
            <GuestCodeSettings />
          </RouteDebug>
        }
      />
      <Route
        path="/upload"
        element={
          <RouteDebug name="upload">
            <DropFiles showDashboard={false} />
          </RouteDebug>
        }
      />
      <Route
        path="/locations"
        element={
          <RouteDebug name="locations">
            <Locations />
          </RouteDebug>
        }
      />
      <Route path="/paid" element={<AfterPayment />} />

      {/* Catch-all route - MUST be last */}
      <Route
        path="/"
        element={
          <RouteDebug name="home-root">
            <Home />
          </RouteDebug>
        }
      />

      {/* Fallback for any other routes */}
      <Route
        path="*"
        element={
          <RouteDebug name="home-fallback">
            {({ params }) => {
              // If it's the user's own profile path, we should redirect to the dashboard
              if (isUserOwnProfilePath) {
                return <Navigate to={userProfilePath} replace />;
              }

              // If it's a brand-related path but not matched by any specific route,
              // we should try to render the BrandProfile component
              if (isBrandRelatedPath) {
                // Check if this might be an event URL with a date pattern
                const pathParts = location.pathname.substring(2).split("/");

                // If there's a second part and it looks like a date (6 digits, possibly with a suffix)
                if (
                  pathParts.length > 1 &&
                  /^\d{6}(-\d+)?$/.test(pathParts[1])
                ) {
                  return <EventProfile />;
                }

                // Otherwise, treat as a brand profile
                const brandUsername = pathParts[0]; // First part after /@
                return <BrandProfile key={brandUsername} />;
              }

              return <Home />;
            }}
          </RouteDebug>
        }
      />
    </Routes>
  );
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

// Main App component
function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <ChatProvider>
            <NotificationProvider>
              <Toaster position="top-center" />
              <ToastProvider>
                <DeviceRestriction>
                  <div className="app">
                    <RouteGuard>
                      <AppRoutes />
                    </RouteGuard>
                  </div>
                </DeviceRestriction>
              </ToastProvider>
            </NotificationProvider>
          </ChatProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
