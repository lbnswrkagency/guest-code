import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.scss";
import AuthContext from "../../../contexts/AuthContext";
import Navigation from "../../Navigation/Navigation";
import { useToast } from "../../Toast/ToastContext";

// Debug logging utility
const debugLog = (area, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[Auth:${area}] ${message}`;
  if (data) {
    console.log(logMessage, { ...data, timestamp });
  } else {
    console.log(logMessage, { timestamp });
  }
};

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    debugLog("Login", "Starting login process", {
      email: formData.email,
      hasPassword: !!formData.password,
    });

    try {
      debugLog("Login", "Calling AuthContext login function");
      await login(formData);

      debugLog("Login", "Login successful", {
        hasToken: !!localStorage.getItem("token"),
        tokenLength: localStorage.getItem("token")?.length,
        availableKeys: Object.keys(localStorage),
      });

      toast.showSuccess("Welcome back!");
    } catch (error) {
      debugLog("Error", "Login failed", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          withCredentials: error.config?.withCredentials,
        },
      });

      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.showError(errorMessage);
    } finally {
      debugLog("Login", "Login attempt completed", {
        success: !!localStorage.getItem("token"),
      });
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    debugLog("Navigation", "User clicked forgot password");
    toast.showInfo("Forgot password functionality coming soon!");
  };

  return (
    <div className="login">
      <Navigation />

      <motion.div
        className="login-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="login-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Welcome Back
        </motion.h1>

        <motion.form
          className="login-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="input-group">
            <input
              type="text"
              name="email"
              placeholder="Email or Username"
              value={formData.email}
              onChange={handleChange}
              required
              className="login-input"
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="login-input"
              autoComplete="current-password"
            />
          </div>

          <div className="forgot-password">
            <span onClick={handleForgotPassword}>Forgot Password?</span>
          </div>

          <motion.button
            type="submit"
            className={`login-submit ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
            whileHover={!isLoading ? { scale: 1.02 } : {}}
            whileTap={!isLoading ? { scale: 0.98 } : {}}
          >
            {isLoading ? "Logging in..." : "Login"}
          </motion.button>
        </motion.form>

        <motion.p
          className="login-register-link"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Don't have an account?{" "}
          <span onClick={() => navigate("/register")}>Sign up here</span>
        </motion.p>
      </motion.div>
    </div>
  );
}

export default Login;
