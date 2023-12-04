import React, { createContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  fetchUserData,
  loginUser,
} from "../Components/AuthForm/Login/LoginFunction";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation(); // Get current location

  const pathsRequiringAuth = [
    "/dashboard",
    "/events",
    "/events/create",
    "/events/:eventId",
    "/guest-code-settings",
    "/login",
    "/register",
    "/registration-success",
    "/verify/:token",
    // ... any other paths that require authentication
  ];

  const fetchData = async () => {
    try {
      const userData = await fetchUserData();
      setUser(userData);
    } catch (error) {
      console.error("Error fetching user data: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pathsRequiringAuth.includes(location.pathname)) {
      fetchData();
    } else {
      setLoading(false); // Set loading to false if auth is not required
    }
  }, [location.pathname]);

  const login = async (email, password, navigate) => {
    try {
      const data = await loginUser(email, password);
      setUser(data);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
