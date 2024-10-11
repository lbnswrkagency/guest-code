import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./Register.scss";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Register({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    birthday: "",
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isValid = Object.values(formData).every(
      (value) => value.trim() !== ""
    );
    setIsFormValid(isValid && formData.password === formData.confirmPassword);
  }, [formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      console.log("Sending registration request...");
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/register`,
        formData
      );
      console.log("Registration response:", response);

      if (response.data.success) {
        console.log("Registration successful");
        toast.success(
          "Registration successful! Please check your email (including spam folder) to verify your account."
        );
        onRegisterSuccess(response.data);
      } else {
        console.error("Registration failed with success: false", response.data);
        toast.error(
          response.data.message || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      console.error("Error response:", error.response);
      toast.error(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    }
  };

  return (
    <div className="register">
      <div
        className="login-back-arrow login-back-arrow-absolute"
        onClick={() => navigate("/")}
      >
        <img src="/image/back-icon.svg" alt="Back" />
      </div>

      <motion.img
        className="register-logo"
        src="/image/logo.svg"
        alt="Logo"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      <Toaster />
      <motion.div
        className="register-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="register-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Join the Community
        </motion.h1>
        <motion.form
          className="register-form"
          onSubmit={handleRegister}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <input
            className="register-input"
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            className="register-input"
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <div className="input-row">
            <input
              className="register-input"
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <input
              className="register-input"
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
          <input
            className="register-input birthday-input"
            type="date"
            name="birthday"
            placeholder="Birthday"
            value={formData.birthday}
            onChange={handleChange}
            required
          />
          <input
            className="register-input"
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            className="register-input"
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <motion.button
            className={`register-form-submit ${
              isFormValid ? "active" : "disabled"
            }`}
            type="submit"
            disabled={!isFormValid}
            whileHover={isFormValid ? { scale: 1.05 } : {}}
            whileTap={isFormValid ? { scale: 0.95 } : {}}
          >
            Register
          </motion.button>
        </motion.form>
        <motion.p
          className="register-login-link"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Login here</span>
        </motion.p>
      </motion.div>
    </div>
  );
}

export default Register;
