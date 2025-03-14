import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.scss";
import AuthContext from "../../../contexts/AuthContext";
import Navigation from "../../Navigation/Navigation";
import { useToast } from "../../Toast/ToastContext";
import { useDispatch } from "react-redux";
import { setUser, setLoading, setError } from "../../../redux/userSlice";
import Maintenance from "../../Maintenance/Maintenance";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Set Redux loading state
    dispatch(setLoading());

    try {
      // Perform the login
      const userData = await login(formData);

      // Ensure we're getting the full user object with all properties
      const fullUserData = userData?.user || userData;

      // Set complete user data in Redux
      dispatch(setUser(fullUserData));

      toast.showSuccess("Welcome back!");
    } catch (error) {
      // Set error in Redux
      dispatch(setError(error.message || "Login failed"));

      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loginContent = (
    <div className="login">
      <Navigation />

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

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );

  // Wrap the entire login content with the Maintenance component
  return <Maintenance>{loginContent}</Maintenance>;
}

export default Login;
