import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
    if (alphaPassword === "YAELOMATICO") {
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
        )}
      </AnimatePresence>
    </div>
  );
}

export default Login;
