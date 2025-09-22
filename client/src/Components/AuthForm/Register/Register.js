import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useToast } from "../../Toast/ToastContext";
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
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: "",
  });
  const [checkTimer, setCheckTimer] = useState(null);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    const isValid = 
      formData.username.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.birthday !== "" &&
      formData.password.trim() !== "" &&
      formData.confirmPassword.trim() !== "" &&
      formData.password === formData.confirmPassword &&
      (usernameStatus.available === true || usernameStatus.available === null);
    setIsFormValid(isValid);
  }, [formData, usernameStatus.available]);

  // Check username availability
  const checkUsername = useCallback(async (username) => {
    if (!username || username.length < 3) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: username.length > 0 ? "Username must be at least 3 characters" : "",
      });
      return;
    }

    setUsernameStatus({
      checking: true,
      available: null,
      message: "",
    });

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/auth/check-username/${username}`
      );

      setUsernameStatus({
        checking: false,
        available: response.data.available,
        message: response.data.message,
      });
    } catch (error) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Error checking username",
      });
    }
  }, []);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'username':
        if (!value.trim()) {
          newErrors[name] = 'Username is required';
        } else if (value.length < 3) {
          newErrors[name] = 'Username must be at least 3 characters';
        } else if (usernameStatus.available === false) {
          newErrors[name] = 'Username is not available';
        } else {
          delete newErrors[name];
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          newErrors[name] = 'Email is required';
        } else if (!emailRegex.test(value)) {
          newErrors[name] = 'Please enter a valid email';
        } else {
          delete newErrors[name];
        }
        break;
      case 'firstName':
        if (!value.trim()) {
          newErrors[name] = 'First name is required';
        } else {
          delete newErrors[name];
        }
        break;
      case 'lastName':
        if (!value.trim()) {
          newErrors[name] = 'Last name is required';
        } else {
          delete newErrors[name];
        }
        break;
      case 'birthday':
        if (!value) {
          newErrors[name] = 'Birthday is required';
        } else {
          delete newErrors[name];
        }
        break;
      case 'password':
        if (!value.trim()) {
          newErrors[name] = 'Password is required';
        } else if (value.length < 6) {
          newErrors[name] = 'Password must be at least 6 characters';
        } else {
          delete newErrors[name];
        }
        // Also validate confirm password if it's been touched
        if (touched.confirmPassword && formData.confirmPassword) {
          if (value !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
          } else {
            delete newErrors.confirmPassword;
          }
        }
        break;
      case 'confirmPassword':
        if (!value.trim()) {
          newErrors[name] = 'Please confirm your password';
        } else if (value !== formData.password) {
          newErrors[name] = 'Passwords do not match';
        } else {
          delete newErrors[name];
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Validate field if it's been touched
    if (touched[name]) {
      validateField(name, value);
    }

    // Check username availability with debounce
    if (name === "username") {
      // Clear existing timer
      if (checkTimer) {
        clearTimeout(checkTimer);
      }

      // Set new timer for 500ms delay
      const timer = setTimeout(() => {
        checkUsername(value);
      }, 500);

      setCheckTimer(timer);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log('=== CLIENT REGISTRATION ATTEMPT ===');
    console.log('Form data:', formData);
    console.log('API Base URL:', process.env.REACT_APP_API_BASE_URL);
    console.log('Is form valid:', isFormValid);
    
    // Mark all fields as touched to show errors
    const allTouched = {
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      birthday: true,
      password: true,
      confirmPassword: true
    };
    setTouched(allTouched);
    
    // Validate all fields
    const fieldErrors = {};
    Object.keys(formData).forEach(field => {
      const validationErrors = validateField(field, formData[field]);
      if (validationErrors[field]) {
        fieldErrors[field] = validationErrors[field];
      }
    });
    
    // Validate each field and collect missing ones
    const missingFields = [];
    
    if (!formData.username.trim()) missingFields.push('username');
    if (!formData.email.trim()) missingFields.push('email');
    if (!formData.firstName.trim()) missingFields.push('first name');
    if (!formData.lastName.trim()) missingFields.push('last name');
    if (!formData.birthday) missingFields.push('birthday');
    if (!formData.password.trim()) missingFields.push('password');
    if (!formData.confirmPassword.trim()) missingFields.push('password confirmation');
    
    // Check if there are missing fields
    if (missingFields.length > 0) {
      let errorMessage;
      if (missingFields.length === 1) {
        errorMessage = `Please enter your ${missingFields[0]}`;
      } else if (missingFields.length === 2) {
        errorMessage = `Please enter your ${missingFields[0]} and ${missingFields[1]}`;
      } else {
        const lastField = missingFields.pop();
        errorMessage = `Please enter your ${missingFields.join(', ')}, and ${lastField}`;
      }
      showError(errorMessage, { duration: 4000 });
      return;
    }
    
    // Check username availability
    if (usernameStatus.available === false) {
      showError("Username is not available", { duration: 4000 });
      return;
    }
    
    if (formData.username.length < 3) {
      showError("Username must be at least 3 characters", { duration: 4000 });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showError("Please enter a valid email address", { duration: 4000 });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Passwords do not match');
      showError("Passwords do not match", { duration: 4000 });
      return;
    }
    
    // Password strength check
    if (formData.password.length < 6) {
      showError("Password must be at least 6 characters", { duration: 4000 });
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
        showSuccess("Registration successful!");
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
      showError(errorMessage, { duration: 6000 });
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
                className={`register-input username-input ${touched.username && errors.username ? 'error' : ''}`}
                type="text"
                name="username"
                placeholder="Choose your username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <div className="username-status">
                {usernameStatus.checking && (
                  <div className="status-checking">
                    <span className="checking-spinner"></span>
                  </div>
                )}
                {!usernameStatus.checking && formData.username && (
                  <div className={`status-icon ${usernameStatus.available ? 'available' : 'unavailable'}`}>
                    {usernameStatus.available ? '✓' : '×'}
                  </div>
                )}
              </div>
            </div>
            {touched.username && errors.username ? (
              <p className="input-hint error">{errors.username}</p>
            ) : (
              <p className={`input-hint ${usernameStatus.message && !usernameStatus.available ? 'error' : ''}`}>
                {usernameStatus.message || "This will be your unique identifier"}
              </p>
            )}
          </div>

          <div className="input-group">
            <input
              className={`register-input ${touched.email && errors.email ? 'error' : ''}`}
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.email && errors.email && (
              <p className="input-hint error">{errors.email}</p>
            )}
          </div>

          <div className="input-row">
            <div className="input-group">
              <input
                className={`register-input ${touched.firstName && errors.firstName ? 'error' : ''}`}
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              {touched.firstName && errors.firstName && (
                <p className="input-hint error">{errors.firstName}</p>
              )}
            </div>
            <div className="input-group">
              <input
                className={`register-input ${touched.lastName && errors.lastName ? 'error' : ''}`}
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              {touched.lastName && errors.lastName && (
                <p className="input-hint error">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="input-group date-input-group">
            <div className="date-input-wrapper">
              <span className="date-field-label">Birthday</span>
              <input
                className={`register-input ${touched.birthday && errors.birthday ? 'error' : ''}`}
                type="date"
                name="birthday"
                placeholder="Select your birth date"
                value={formData.birthday}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                aria-label="Select your birth date"
                title="Select your birth date"
              />
            </div>
            {touched.birthday && errors.birthday && (
              <p className="input-hint error">{errors.birthday}</p>
            )}
          </div>

          <div className="input-group">
            <input
              className={`register-input ${touched.password && errors.password ? 'error' : ''}`}
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.password && errors.password && (
              <p className="input-hint error">{errors.password}</p>
            )}
          </div>

          <div className="input-group">
            <input
              className={`register-input ${touched.confirmPassword && errors.confirmPassword ? 'error' : ''}`}
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <p className="input-hint error">{errors.confirmPassword}</p>
            )}
          </div>

          <motion.button
            className="register-form-submit active"
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
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
