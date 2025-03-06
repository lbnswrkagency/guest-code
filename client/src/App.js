<<<<<<< HEAD
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
=======
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
>>>>>>> master
import { Toaster } from "react-hot-toast";
import { ToastProvider } from "./Components/Toast/ToastContext";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { ChatProvider } from "./contexts/ChatContext";

import Dashboard from "./Components/Dashboard/Dashboard";
import Home from "./Components/Home/Home";
import Login from "./Components/AuthForm/Login/Login";
import Register from "./Components/AuthForm/Register/Register";
import EmailVerification from "./Components/EmailVerification/EmailVerification";
import RegistrationSuccess from "./Components/RegistrationSuccess/RegistrationSuccess";
import EventDetails from "./Components/EventDetails/EventDetails";
import GuestCodeSettings from "./Components/GuestCodeSettings/GuestCodeSettings";
import DropFiles from "./Components/DropFiles/DropFiles";
import Locations from "./Components/Locations/Locations";
<<<<<<< HEAD
import BrandProfile from "./Components/BrandProfile/BrandProfile";
import Brands from "./Components/Brands/Brands";
import Events from "./Components/Events/Events";
import EventProfile from "./Components/EventProfile/EventProfile";
import AfterPayment from "./Components/AfterPayment/AfterPayment";

// Main routing component
const AppRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  const params = useParams();

  // Pre-build the user profile route if we have a user
  const userProfilePath = user ? `/@${user.username.trim()}` : null;

  // Add detailed logging for route debugging
  console.log("[AppRoutes] Rendering with:", {
    pathname: location.pathname,
    isAuthenticated: !!user,
    userProfilePath,
    params,
    timestamp: new Date().toISOString(),
  });

  // Log all route patterns for debugging
  const allRoutes = [
    "/@:brandUsername",
    "/@:brandUsername/:dateSlug",
    "/@:brandUsername/@:eventUsername/:dateSlug",
    "/@:brandUsername/@:eventUsername",
    "/@:brandUsername/e/:dateSlug",
    "/@:brandUsername/e/:dateSlug/:eventSlug",
  ];

  // Check which routes would match the current path
  allRoutes.forEach((routePath) => {
    const match = matchPath({ path: routePath, end: true }, location.pathname);
    if (match) {
      console.log(
        `[AppRoutes] Route '${routePath}' matches with params:`,
        match.params
      );
    }
  });

  // Check if the current path matches the brand profile pattern
  const isBrandProfilePath = /^\/@[a-zA-Z0-9_-]+$/.test(location.pathname);

  // Check if the path starts with /@ to handle all brand-related routes
  const isBrandRelatedPath = location.pathname.startsWith("/@");

  // Check if this is the user's own profile path
  const isUserOwnProfilePath =
    userProfilePath && location.pathname === userProfilePath;

  console.log(`[AppRoutes] Path analysis:`, {
    pathname: location.pathname,
    isBrandProfilePath,
    isBrandRelatedPath,
    isUserOwnProfilePath,
    userProfilePath,
    timestamp: new Date().toISOString(),
  });

  return (
    <Routes>
      {/* Special case for brand profile path - but only if it's not the user's own profile */}
      {isBrandProfilePath && !isUserOwnProfilePath && (
        <Route
          path={location.pathname}
          element={
            <RouteDebug name="brand-profile-direct-match">
              {({ params }) => {
                console.log(
                  "[Route:direct-match] Matched brand profile path:",
                  location.pathname
                );
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
                  console.log(
                    "[Route:user-own-profile] Matched user's own profile path:",
                    location.pathname
                  );
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
              console.log(
                "[Route:/@:brandUsername] Matched with params:",
                params
              );
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
              console.log(
                "[Route:/@:brandUsername/:dateSlug] Matched with params:",
                params
              );
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
=======
import UnderConstruction from "./Components/UnderConstruction/UnderConstruction";

function App() {
  const eventId = "l9xm6f9c";
  const [showConstruction, setShowConstruction] = useState(true);

  // Uncomment this to allow hiding the overlay after a set time
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setShowConstruction(false);
  //   }, 10000); // Hide after 10 seconds
  //   return () => clearTimeout(timer);
  // }, []);
>>>>>>> master

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
              console.log(
                "[Route:*] Fallback route matched with path:",
                location.pathname
              );

              // If it's the user's own profile path, we should redirect to the dashboard
              if (isUserOwnProfilePath) {
                console.log(
                  "[Route:*] Detected user's own profile path, redirecting to dashboard"
                );
                return <Navigate to={userProfilePath} replace />;
              }

              // If it's a brand-related path but not matched by any specific route,
              // we should try to render the BrandProfile component
              if (isBrandRelatedPath) {
                console.log(
                  "[Route:*] Detected brand-related path, rendering BrandProfile"
                );

                // Check if this might be an event URL with a date pattern
                const pathParts = location.pathname.substring(2).split("/");

                // If there's a second part and it looks like a date (6 digits, possibly with a suffix)
                if (
                  pathParts.length > 1 &&
                  /^\d{6}(-\d+)?$/.test(pathParts[1])
                ) {
                  console.log(
                    "[Route:*] Detected date pattern in URL, rendering EventProfile"
                  );
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

  // Enhanced logging for route debugging
  console.log(`[RouteDebug:${name}] Rendering route:`, {
    name,
    pathname: location.pathname,
    params,
    timestamp: new Date().toISOString(),
  });

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
    timestamp: new Date().toISOString(),
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
<<<<<<< HEAD
          <ChatProvider>
            <NotificationProvider>
              <Toaster position="top-center" />
              <ToastProvider>
                <div className="app">
                  <AppRoutes />
                </div>
              </ToastProvider>
            </NotificationProvider>
          </ChatProvider>
=======
          <NotificationProvider>
            <Toaster position="top-center" />

            {showConstruction && <UnderConstruction />}

            <Routes>
              <Route path="/" element={<EventPage passedEventId={eventId} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard/*" element={<Dashboard />}>
                <Route path="chat/:chatId" element={<PersonalChat />} />
              </Route>
              <Route
                path="/registration-success"
                element={<RegistrationSuccess />}
              />
              <Route path="/verify/:token" element={<EmailVerification />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/create" element={<CreateEvent />} />
              <Route path="/events/:eventId" element={<EventDetails />} />
              <Route path="/events/page/:eventId" element={<EventPage />} />
              <Route
                path="/guest-code-settings"
                element={<GuestCodeSettings />}
              />
              <Route
                path="/upload"
                element={<DropFiles showDashboard={false} />}
              />
              <Route path="/share" element={<RedirectToDropbox />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/locations" element={<Locations />} />
            </Routes>
          </NotificationProvider>
>>>>>>> master
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
