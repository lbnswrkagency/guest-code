import React, { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./Login.scss";
import AuthContext from "../../../contexts/AuthContext";
import Navigation from "../../Navigation/Navigation";
import { useToast } from "../../Toast/ToastContext";

// Debug logging utility
const debugLog = (area, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[Auth:${area}] ${message}`;

  // Enhanced logging with more details
  if (data) {
    console.log(logMessage, { ...data, timestamp });

    // Log to server if in development
    if (process.env.NODE_ENV === "development") {
      try {
        fetch("/api/debug-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area, message, data, timestamp }),
        }).catch(() => {});
      } catch (e) {}
    }
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
  const [alphaPassword, setAlphaPassword] = useState("");
  const [isAlphaVerified, setIsAlphaVerified] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  // Check if alpha password is already verified in session storage
  useEffect(() => {
    const verified = sessionStorage.getItem("alphaVerified") === "true";
    if (verified) {
      setIsAlphaVerified(true);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAlphaPasswordChange = (e) => {
    setAlphaPassword(e.target.value);
    if (showPasswordError) setShowPasswordError(false);
  };

  const handleAlphaPasswordSubmit = (e) => {
    e.preventDefault();
    if (alphaPassword === process.env.REACT_APP_ALPHA_PW) {
      setIsAlphaVerified(true);
      sessionStorage.setItem("alphaVerified", "true");
    } else {
      setShowPasswordError(true);
      setAlphaPassword("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    debugLog("Login", "Starting login process", {
      email: formData.email,
      hasPassword: !!formData.password,
      passwordLength: formData.password?.length,
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
      },
      timestamp: new Date().toISOString(),
    });

    try {
      debugLog("Login", "Calling AuthContext login function");

      // Track request timing
      const startTime = performance.now();
      await login(formData);
      const endTime = performance.now();

      debugLog("Login", "Login successful", {
        email: formData.email,
        responseTime: `${Math.round(endTime - startTime)}ms`,
        hasToken: !!localStorage.getItem("token"),
        tokenLength: localStorage.getItem("token")?.length,
        availableKeys: Object.keys(localStorage),
        cookies: document.cookie
          .split(";")
          .map((c) => c.trim())
          .filter((c) => c),
      });

      toast.showSuccess("Welcome back!");
    } catch (error) {
      debugLog("Error", "Login failed", {
        email: formData.email,
        errorType: error.name,
        errorMessage: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          withCredentials: error.config?.withCredentials,
          timeout: error.config?.timeout,
        },
        stack: error.stack,
      });

      // Additional logging for network errors
      if (error.message === "Network Error") {
        debugLog("Network", "Network error details", {
          online: navigator.onLine,
          readyState: document.readyState,
          connectionType: navigator.connection
            ? navigator.connection.effectiveType
            : "unknown",
        });
      }

      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.showError(errorMessage);
    } finally {
      debugLog("Login", "Login attempt completed", {
        email: formData.email,
        success: !!localStorage.getItem("token"),
        timestamp: new Date().toISOString(),
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

      <AnimatePresence mode="wait">
        {!isAlphaVerified ? (
          <motion.div
            className="alpha-password-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="alpha-password"
          >
            <div className="animated-background">
              {/* Nebula effects */}
              <div className="nebula-container">
                <div className="nebula"></div>
                <div className="nebula"></div>
              </div>

              {/* Star field */}
              <div className="star-container">
                {[...Array(30)].map((_, i) => (
                  <div key={`star-${i}`} className="star"></div>
                ))}
              </div>

              {/* Particles */}
              <div className="particles-container">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={`particle-${i}`}
                    className={`particle particle-${i + 1}`}
                  ></div>
                ))}
              </div>

              {/* Glow overlay */}
              <div className="glow-overlay"></div>
            </div>

            <motion.div
              className="alpha-content"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                GuestCode
              </motion.h1>
              <motion.p
                className="alpha-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                Alpha Access
              </motion.p>
              <motion.form
                onSubmit={handleAlphaPasswordSubmit}
                className="alpha-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <div className="alpha-input-group">
                  <input
                    type="password"
                    value={alphaPassword}
                    onChange={handleAlphaPasswordChange}
                    placeholder="Enter access code"
                    className={`alpha-input ${
                      showPasswordError ? "error" : ""
                    }`}
                    autoFocus
                    autoComplete="new-password"
                  />
                  {showPasswordError && (
                    <motion.p
                      className="alpha-error"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      Invalid access code
                    </motion.p>
                  )}
                </div>
                <motion.button
                  type="submit"
                  className="alpha-submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Enter
                </motion.button>
              </motion.form>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            className="login-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            key="login-form"
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

              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </button>

              <div className="login-options">
                <span
                  className="forgot-password"
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </span>
                <Link to="/register" className="register-link">
                  Create Account
                </Link>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Login;
