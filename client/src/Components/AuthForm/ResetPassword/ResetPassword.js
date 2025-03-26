import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import "./ResetPassword.scss";
import Navigation from "../../Navigation/Navigation";
import { useToast } from "../../Toast/ToastContext";

function ResetPassword() {
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [isValidating, setIsValidating] = useState(true);
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Validate the token when component mounts
  useEffect(() => {
    // Don't validate if reset was already successful
    if (resetSuccess) {
      return;
    }

    const validateToken = async () => {
      setIsValidating(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/auth/validate-reset-token/${token}`
        );

        if (response.data.success) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          toast.showError("Password reset link is invalid or has expired");
        }
      } catch (error) {
        console.error("Token validation error:", error);
        setTokenValid(false);
        toast.showError("Password reset link is invalid or has expired");
      } finally {
        setIsValidating(false);
      }
    };

    let validationTimer;
    if (token) {
      // Debounce the validation to prevent multiple calls
      clearTimeout(validationTimer);
      validationTimer = setTimeout(() => {
        validateToken();
      }, 300);
    } else {
      setTokenValid(false);
      setIsValidating(false);
    }

    return () => {
      clearTimeout(validationTimer);
    };
  }, [token, toast, resetSuccess]);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwords.password !== passwords.confirmPassword) {
      toast.showError("Passwords do not match");
      return;
    }

    if (passwords.password.length < 6) {
      toast.showError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/reset-password/${token}`,
        { password: passwords.password }
      );

      setResetSuccess(true);
      toast.showSuccess("Password has been reset successfully");

      // Disable validation after successful reset to prevent error messages
      setIsValidating(false);
      setTokenValid(true);
    } catch (error) {
      console.error("Password reset error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to reset password. Please try again.";
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="reset-password">
        <Navigation />
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Validating your reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-password">
        <Navigation />
        <motion.div
          className="reset-password-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="invalid-token">
            <div className="error-icon">!</div>
            <h2>Invalid Reset Link</h2>
            <p>Your password reset link is invalid or has expired.</p>
            <motion.button
              onClick={() => navigate("/forgot-password")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="reset-button"
            >
              Request New Reset Link
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="reset-password">
        <Navigation />
        <motion.div
          className="reset-password-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="reset-success">
            <div className="success-icon">✓</div>
            <h2>Password Reset Complete</h2>
            <p>Your password has been reset successfully.</p>
            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="login-button"
            >
              Go to Login
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="reset-password">
      <Navigation />

      <motion.div
        className="reset-password-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="reset-password-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Create New Password
        </motion.h1>

        <motion.p
          className="reset-password-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Please enter your new password below.
        </motion.p>

        <motion.form
          className="reset-password-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="New Password"
              value={passwords.password}
              onChange={handleChange}
              required
              className="reset-password-input"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={passwords.confirmPassword}
              onChange={handleChange}
              required
              className="reset-password-input"
            />
          </div>

          <button
            type="submit"
            className="reset-password-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}

export default ResetPassword;
