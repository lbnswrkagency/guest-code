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

// Main routing component
const AppRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  const params = useParams();

  // Pre-build the user profile route if we have a user
  const userProfilePath = user ? `/@${user.username}` : null;

  // Custom route matcher for user profiles
  const matchUserProfile = (pattern, pathname) => {
    const match = matchPath(
      {
        path: pattern,
        end: true,
      },
      pathname
    );

    return match;
  };

  // Enhanced logging for route debugging
  // console.log("[AppRoutes] Detailed route matching:", {
  //   currentPath: location.pathname,
  //   userProfilePath,
  //   exactMatch: location.pathname === userProfilePath,
  //   hasUser: !!user,
  //   username: user?.username,
  //   authenticatedBrandPath: user ? `${userProfilePath}/@:brandUsername` : null,
  //   authenticatedEventPath: user
  //     ? `${userProfilePath}/@:brandUsername/@:eventUsername`
  //     : null,
  //   isAuthenticatedBrandRoute:
  //     user && location.pathname.startsWith(userProfilePath + "/@"),
  //   pathSegments: location.pathname.split("/").filter(Boolean),
  //   timestamp: new Date().toISOString(),
  // });

  // Log available routes
  // console.log("[AppRoutes] Available routes:", {
  //   authenticatedRoutes: user
  //     ? [
  //         userProfilePath,
  //         `${userProfilePath}/@:brandUsername`,
  //         `${userProfilePath}/@:brandUsername/@:eventUsername`,
  //       ]
  //     : [],
  //   publicRoutes: ["/@:brandUsername", "/@:brandUsername/@:eventUsername"],
  //   timestamp: new Date().toISOString(),
  // });

  // console.log("[AppRoutes] Route state:", {
  //   pathname: location.pathname,
  //   params,
  //   userProfilePath,
  //   timestamp: new Date().toISOString(),
  // });

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
                  path=":brandUsername"
                  element={
                    <RouteDebug name="brand-profile-auth">
                      {({ params }) => {
                        // console.log("[AppRoutes] Brand route matched:", {
                        //   params,
                        //   pathname: location.pathname,
                        //   timestamp: new Date().toISOString(),
                        // });
                        return <BrandProfile />;
                      }}
                    </RouteDebug>
                  }
                />
                <Route
                  path=":brandUsername/:eventUsername"
                  element={
                    <RouteDebug name="event-auth">
                      <EventDetails />
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
                <BrandProfile />
              </RouteDebug>
            }
          />
          <Route
            path="/@:brandUsername/@:eventUsername"
            element={
              <RouteDebug name="event-public">
                <EventDetails />
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
