import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./Register.scss";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navigation from "../../Home/Navigation/Navigation";

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
  const [registrationComplete, setRegistrationComplete] = useState(false);
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
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/register`,
        formData
      );

      if (response.data.success) {
        setRegistrationComplete(true);
        toast.success("Registration successful!", {
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
      toast.error(errorMessage, {
        duration: 4000,
      });
      return;
    }
  };

  if (registrationComplete) {
    return (
      <div className="register">
        <Navigation />
        <motion.div
          className="register-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="verification-status success">
            <div className="success-icon">✓</div>
            <h2>Welcome to GuestCode!</h2>
            <p>Please check your email to verify your account.</p>
            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="register-form-submit active"
            >
              Go to Login
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="register">
      <Navigation />
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
          Create Your Account
        </motion.h1>
        <motion.form
          className="register-form"
          onSubmit={handleRegister}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="input-group username-group">
            <div className="username-wrapper">
              <span className="username-prefix">@</span>
              <input
                className="register-input username-input"
                type="text"
                name="username"
                placeholder="Choose your username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <p className="input-hint">This will be your unique identifier</p>
          </div>

          <div className="input-group">
            <input
              className="register-input"
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

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

          <div className="input-group">
            <input
              className="register-input"
              type="date"
              name="birthday"
              placeholder="Birthday"
              value={formData.birthday}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <input
              className="register-input"
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <input
              className="register-input"
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <motion.button
            className={`register-form-submit ${
              isFormValid ? "active" : "disabled"
            }`}
            type="submit"
            disabled={!isFormValid}
            whileHover={isFormValid ? { scale: 1.02 } : {}}
            whileTap={isFormValid ? { scale: 0.98 } : {}}
          >
            Create Account
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
