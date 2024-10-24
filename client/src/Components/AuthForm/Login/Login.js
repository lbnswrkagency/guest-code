import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthContext from "../../../contexts/AuthContext";
import "./Login.scss";
import { motion } from "framer-motion";

const Login = () => {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    setIsFormValid(
      formData.identifier.trim() !== "" && formData.password.trim() !== ""
    );
  }, [formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/login`,
        formData,
        { withCredentials: true }
      );

      const { accessToken } = response.data;
      if (accessToken) {
        localStorage.setItem("token", accessToken);
        try {
          await fetchUserData();
          navigate("/dashboard");
        } catch (error) {
          console.error("Error fetching user data after login:", error);
          // Handle the error appropriately
        }
      } else {
        console.error("No access token received");
      }
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      // Show error to user
    }
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/auth/user`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      if (response.data) {
        setUser(response.data);
      } else {
        throw new Error("No user data received");
      }
    } catch (error) {
      console.error(
        "Error fetching user data:",
        error.response?.data || error.message
      );
      localStorage.removeItem("token"); // Clear invalid token
      throw error;
    }
  };
  return (
    <div className="login-container">
      <motion.div
        className="login-back-arrow login-back-arrow-absolute"
        onClick={() => navigate("/")}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <img src="/image/back-icon.svg" alt="Back" />
      </motion.div>

      <motion.img
        className="login-logo"
        src="/image/logo.svg"
        alt="Logo"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      <motion.h2
        className="login-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Member Area
      </motion.h2>

      <motion.form
        className="login-form"
        onSubmit={handleSubmit}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <input
          className="login-input"
          type="text"
          name="identifier"
          placeholder="Username or Email"
          value={formData.identifier}
          onChange={handleChange}
        />
        <input
          className="login-input"
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />
        <motion.button
          className={`login-submit ${isFormValid ? "active" : "disabled"}`}
          type="submit"
          disabled={!isFormValid}
          whileHover={isFormValid ? { scale: 1.05 } : {}}
          whileTap={isFormValid ? { scale: 0.95 } : {}}
        >
          Login
        </motion.button>
      </motion.form>

      {/*
      <motion.p
        className="login-register-link"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        Not a member yet?{" "}
        <span onClick={() => navigate("/register")}>Register here</span>
      </motion.p>

*/}
    </div>
  );
};

export default Login;
