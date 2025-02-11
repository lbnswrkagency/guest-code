import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import "./Login.scss";
import { login } from "./LoginFunction";
import AuthContext from "../../../contexts/AuthContext";
import Navigation from "../../Home/Navigation/Navigation";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("🚀 Login attempt started...", { email: formData.email });

    try {
      console.log("📤 Sending login request to server...");
      const response = await login(formData);
      console.log("📥 Server response received:", {
        success: response.success,
        hasUser: !!response.user,
        hasToken: !!response.token,
      });

      if (response.success) {
        console.log("✅ Login successful, setting user in context...");
        setUser(response.user);
        toast.success("Welcome back!", { duration: 3000 });
        console.log("🔄 Navigating to dashboard...");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("❌ Login error:", {
        status: error.response?.status,
        message: error.response?.data?.details || error.response?.data?.message,
        error: error.message,
      });
      const errorMessage =
        error.response?.data?.details ||
        error.response?.data?.message ||
        "Login failed. Please try again.";
      toast.error(errorMessage, {
        duration: 4000,
        position: "top-center",
      });
    } finally {
      console.log("🏁 Login attempt completed");
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // For now, just show a toast. We'll implement this functionality later
    toast.info("Forgot password functionality coming soon!", {
      duration: 4000,
      position: "top-center",
    });
  };

  return (
    <div className="login">
      <Navigation />
      <Toaster />

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
