import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./Register.scss";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navigation from "../../Navigation/Navigation";

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
    console.log('=== CLIENT REGISTRATION ATTEMPT ===');
    console.log('Form data:', formData);
    console.log('API Base URL:', process.env.REACT_APP_API_BASE_URL);
    console.log('Is form valid:', isFormValid);
    
    if (!isFormValid) {
      console.log('❌ Form is not valid, stopping registration');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Passwords do not match');
      toast.error("Passwords do not match!");
      return;
    }

    console.log('✅ Client-side validation passed');
    console.log('🚀 Sending registration request...');

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/register`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('✅ Registration response received:', response.data);

      if (response.data.success) {
        setRegistrationComplete(true);
        toast.success("Registration successful!", {
          duration: 6000,
        });
      }
    } catch (error) {
      console.log('❌ Registration error occurred:');
      console.error("Full error object:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      console.error("Error message:", error.message);
      
      const errorData = error.response?.data;
      let errorMessage = "Registration failed. Please try again.";
      
      if (errorData) {
        console.log('Server error data:', errorData);
        errorMessage = errorData.details || errorData.message || errorMessage;
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          console.log('Validation errors:', errorData.errors);
          errorMessage = errorData.errors.map(err => err.msg || err.message).join(', ');
        }
        
        if (errorData.validationErrors) {
          console.log('Mongoose validation errors:', errorData.validationErrors);
        }
      }
      
      console.log('Final error message to display:', errorMessage);
      toast.error(errorMessage, {
        duration: 6000,
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
              onClick={() => {}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="register-form-submit active"
            >
              Registration Complete
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="register">
      <Toaster />
      <Navigation />

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

          <div className="input-group date-input-group">
            <div className="date-input-wrapper">
              <span className="date-field-label">Birthday</span>
              <input
                className="register-input"
                type="date"
                name="birthday"
                placeholder="Select your birth date"
                value={formData.birthday}
                onChange={handleChange}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                aria-label="Select your birth date"
                title="Select your birth date"
              />
            </div>
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

        <motion.p
          className="register-login-link"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          Forgot your password?{" "}
          <span onClick={() => navigate("/forgot-password")}>
            Reset it here
          </span>
        </motion.p>
      </motion.div>
    </div>
  );
}

export default Register;
