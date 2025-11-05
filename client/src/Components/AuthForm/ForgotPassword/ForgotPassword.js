import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import "./ForgotPassword.scss";
import Navigation from "../../Navigation/Navigation";
import { useToast } from "../../Toast/ToastContext";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.showError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/forgot-password`,
        { email }
      );

      setResetSent(true);
      toast.showSuccess("Password reset instructions sent to your email");
    } catch (error) {
      console.error("Password reset error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to process your request. Please try again.";
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="forgot-password">
        <Navigation />

        <motion.div
          className="forgot-password-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="reset-sent">
            <div className="success-icon">✓</div>
            <h2>Check Your Email</h2>
            <p>We've sent instructions to reset your password to {email}</p>
            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="back-to-login"
            >
              Back to Login
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="forgot-password">
      <Navigation />

      <motion.div
        className="forgot-password-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="forgot-password-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Reset Your Password
        </motion.h1>

        <motion.p
          className="forgot-password-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Enter your email address and we'll send you instructions to reset your
          password.
        </motion.p>

        <motion.form
          className="forgot-password-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={email}
              onChange={handleChange}
              required
              className="forgot-password-input"
            />
          </div>

          <button
            type="submit"
            className="forgot-password-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Sending...
              </>
            ) : (
              "Reset Password"
            )}
          </button>

          <div className="auth-links">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <span onClick={() => navigate("/login")}>Back to login</span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <span onClick={() => navigate("/register")}>Create account</span>
            </motion.p>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
