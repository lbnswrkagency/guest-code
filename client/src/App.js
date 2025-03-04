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

  console.log("[AppRoutes] Route initialization:", {
    currentPath: location.pathname,
    userState: {
      isAuthenticated: !!user,
      username: user?.username.trim(),
      userProfilePath,
    },
    routeParams: params,
    pathSegments: location.pathname.split("/").filter(Boolean),
    isAuthenticatedRoute: user && location.pathname.startsWith(userProfilePath),
    timestamp: new Date().toISOString(),
  });

  // Enhanced logging for route matching
  console.log("[AppRoutes] Route matching state:", {
    authenticatedRoutes: user
      ? [
          userProfilePath,
          `${userProfilePath}/*`,
          `${userProfilePath}/brands`,
          `${userProfilePath}/:brandUsername`,
          `${userProfilePath}/:brandUsername/:eventUsername`,
          `${userProfilePath}/:brandUsername/:eventUsername/:dateSlug`,
        ]
      : [],
    publicRoutes: [
      "/@:brandUsername",
      "/@:brandUsername/@:eventUsername",
      "/@:brandUsername/@:eventUsername/:dateSlug",
    ],
    currentPath: location.pathname,
    matchesAuthenticatedPath:
      user && location.pathname.startsWith(userProfilePath),
    matchesPublicPath: !user && location.pathname.match(/\/@[\w-]+/),
    timestamp: new Date().toISOString(),
  });

  return (
    <Routes>
      {user ? (
        <>
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
                        console.log("[AppRoutes] Brand route matched:", {
                          params,
                          pathname: location.pathname,
                          userProfilePath,
                          isNestedUnderUserProfile:
                            location.pathname.startsWith(userProfilePath),
                          timestamp: new Date().toISOString(),
                        });
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
                        console.log(
                          "[AppRoutes] Auth event special format route matched:",
                          {
                            params,
                            pathname: location.pathname,
                            paramValues: {
                              brandUsername: params.brandUsername,
                              eventUsername: params.eventUsername,
                              dateSlug: params.dateSlug,
                            },
                            timestamp: new Date().toISOString(),
                          }
                        );
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
                        console.log(
                          "[AppRoutes] Auth event username route matched:",
                          {
                            params,
                            pathname: location.pathname,
                            timestamp: new Date().toISOString(),
                          }
                        );
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
                        console.log(
                          "[AppRoutes] Auth event route with simplified format matched:",
                          {
                            params,
                            pathname: location.pathname,
                            paramValues: {
                              brandUsername: params.brandUsername,
                              dateSlug: params.dateSlug,
                            },
                            timestamp: new Date().toISOString(),
                          }
                        );
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
                        console.log(
                          "[AppRoutes] Auth event route with new format matched:",
                          {
                            params,
                            pathname: location.pathname,
                            paramValues: {
                              brandUsername: params.brandUsername,
                              dateSlug: params.dateSlug,
                              eventSlug: params.eventSlug,
                            },
                            timestamp: new Date().toISOString(),
                          }
                        );
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
                        console.log(
                          `[AppRoutes] :brandUsername/:dateSlug route matched, dateSlug=${params.dateSlug}, isDateFormat=${isDateFormat}`
                        );

                        if (isDateFormat) {
                          console.log(
                            "[AppRoutes] Auth event route with ultra-simplified format matched:",
                            {
                              params,
                              pathname: location.pathname,
                              paramValues: {
                                brandUsername: params.brandUsername,
                                dateSlug: params.dateSlug,
                              },
                              timestamp: new Date().toISOString(),
                            }
                          );
                          return <EventProfile />;
                        } else {
                          // If it's not a date format, use EventProfile anyway to avoid errors
                          console.log(
                            "[AppRoutes] Using EventProfile as fallback for non-date format"
                          );
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
                        console.log(
                          "[AppRoutes] Direct match for special auth format:",
                          {
                            params,
                            pathname: location.pathname,
                            timestamp: new Date().toISOString(),
                          }
                        );
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
          <Route
            path="/@:brandUsername"
            element={
              <RouteDebug name="brand-profile-public">
                {({ params }) => {
                  console.log("[AppRoutes] Public brand route matched:", {
                    params,
                    pathname: location.pathname,
                    timestamp: new Date().toISOString(),
                  });
                  return <BrandProfile />;
                }}
              </RouteDebug>
            }
          />

          {/* New ultra-simplified route for public events with format /@brandusername/MMDDYY */}
          {/* This needs to be before the /@:brandUsername/@:eventUsername route to ensure proper matching */}
          <Route
            path="/@:brandUsername/:dateSlug"
            element={
              <RouteDebug name="event-public-ultra-simplified">
                {({ params }) => {
                  // We need to check if dateSlug is a valid date format to avoid mismatching
                  const isDateFormat = /^\d{6}(-\d+)?$/.test(params.dateSlug);
                  console.log(
                    `[AppRoutes] /@:brandUsername/:dateSlug route matched, dateSlug=${params.dateSlug}, isDateFormat=${isDateFormat}`
                  );

                  if (isDateFormat) {
                    console.log(
                      "[AppRoutes] Public event route with ultra-simplified format matched:",
                      {
                        params,
                        pathname: location.pathname,
                        paramValues: {
                          brandUsername: params.brandUsername,
                          dateSlug: params.dateSlug,
                        },
                        timestamp: new Date().toISOString(),
                      }
                    );
                    return <EventProfile />;
                  } else {
                    // If it's not a date format, it might be another type of route
                    console.log(
                      "[AppRoutes] Not a date format, redirecting..."
                    );
                    return (
                      <Navigate to={`/@${params.brandUsername}`} replace />
                    );
                  }
                }}
              </RouteDebug>
            }
          />

          <Route
            path="/@:brandUsername/@:eventUsername/:dateSlug"
            element={
              <RouteDebug name="event-public-special-format">
                {({ params }) => {
                  console.log(
                    "[AppRoutes] Public event special format route matched:",
                    {
                      params,
                      pathname: location.pathname,
                      paramValues: {
                        brandUsername: params.brandUsername,
                        eventUsername: params.eventUsername,
                        dateSlug: params.dateSlug,
                      },
                      timestamp: new Date().toISOString(),
                    }
                  );
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
                  console.log(
                    "[AppRoutes] Public event username route matched:",
                    {
                      params,
                      pathname: location.pathname,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  return <EventProfile />;
                }}
              </RouteDebug>
            }
          />
          {/* Keep routes with /e/ for backward compatibility */}
          {/* New simplified route for public events with format /@brandusername/e/MMDDYY */}
          <Route
            path="/@:brandUsername/e/:dateSlug"
            element={
              <RouteDebug name="event-public-simple-format">
                {({ params }) => {
                  console.log(
                    "[AppRoutes] Public event route with simplified format matched:",
                    {
                      params,
                      pathname: location.pathname,
                      paramValues: {
                        brandUsername: params.brandUsername,
                        dateSlug: params.dateSlug,
                      },
                      timestamp: new Date().toISOString(),
                    }
                  );
                  return <EventProfile />;
                }}
              </RouteDebug>
            }
          />
          {/* New route for public events with format /@brandusername/e/MMDDYY/event-name-slug */}
          <Route
            path="/@:brandUsername/e/:dateSlug/:eventSlug"
            element={
              <RouteDebug name="event-public-new-format">
                {({ params }) => {
                  console.log(
                    "[AppRoutes] Public event route with new format matched:",
                    {
                      params,
                      pathname: location.pathname,
                      paramValues: {
                        brandUsername: params.brandUsername,
                        dateSlug: params.dateSlug,
                        eventSlug: params.eventSlug,
                      },
                      timestamp: new Date().toISOString(),
                    }
                  );
                  return <EventProfile />;
                }}
              </RouteDebug>
            }
          />
        </>
      )}

      {/* Other routes */}
      <Route
        path="/"
        element={
          <RouteDebug name="home">
            <Home />
          </RouteDebug>
        }
      />
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
    timestamp: new Date().toISOString(),
  };

  // console.log(`[RouteDebug:${name}] Route matched:`, debugInfo);

  return typeof children === "function" ? children(debugInfo) : children;
};

// Separate component for user profile route
const UserProfileRoute = () => {
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // console.log("[UserProfileRoute] Rendering:", {
  //   username,
  //   pathname: location.pathname,
  //   search: location.search,
  //   hash: location.hash,
  //   state: location.state,
  //   params: useParams(),
  //   timestamp: new Date().toISOString(),
  // });

  return <Outlet />;
};

// Main App component
function App() {
  // console.log("[App] Initializing App component", {
  //   timestamp: new Date().toISOString(),
  // });

  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
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
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
