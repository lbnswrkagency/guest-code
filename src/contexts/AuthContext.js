import React, { createContext, useState, useEffect } from "react";
import {
  fetchUserData,
  loginUser,
} from "../Components/AuthForm/Login/LoginFunction";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    fetchData();
  }, []);

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
