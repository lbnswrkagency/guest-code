import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.scss";
import AuthContext from "../../../contexts/AuthContext";
import Navigation from "../../Navigation/Navigation";
import { useToast } from "../../Toast/ToastContext";
import { useDispatch } from "react-redux";
import { loginSuccess, setLoading, setError } from "../../../redux/userSlice";
import { setBrands } from "../../../redux/brandSlice";
import { setEvents } from "../../../redux/eventsSlice";
import { setRoles, setUserRole } from "../../../redux/rolesSlice";
import { setCodeSettings } from "../../../redux/codeSettingsSlice";
import { setLineups } from "../../../redux/lineupSlice";
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
    dispatch(setLoading());

    try {
      const userData = await login(formData);
      const fullUserData = userData?.user || userData;

      // Dispatch loginSuccess with the full user data
      dispatch(loginSuccess({ user: fullUserData }));

      // Process and store data in their respective slices
      if (fullUserData.brands && fullUserData.brands.length > 0) {
        // Store brands
        dispatch(setBrands(fullUserData.brands));
      }

      // Store events if available
      if (fullUserData.events && Array.isArray(fullUserData.events)) {
        dispatch(setEvents(fullUserData.events));
      }

      // Store roles if available
      if (fullUserData.roles) {
        // Store all roles
        if (
          fullUserData.roles.allRoles &&
          Array.isArray(fullUserData.roles.allRoles)
        ) {
          dispatch(setRoles(fullUserData.roles.allRoles));
        }

        // Store user roles mapping
        if (fullUserData.roles.userRoles) {
          // Set each user role individually
          Object.entries(fullUserData.roles.userRoles).forEach(
            ([brandId, roleId]) => {
              dispatch(setUserRole({ brandId, roleId }));
            }
          );
        }
      }

      // Store code settings if available
      if (
        fullUserData.codeSettings &&
        Array.isArray(fullUserData.codeSettings)
      ) {
        dispatch(setCodeSettings(fullUserData.codeSettings));
      }

      // Store lineups if available
      if (fullUserData.lineups && Array.isArray(fullUserData.lineups)) {
        dispatch(setLineups(fullUserData.lineups));
      }

      // Show success toast and navigate
      toast.showSuccess("Welcome back!");
      navigate(`/@${fullUserData.username}`);
    } catch (error) {
      dispatch(setError(error.message || "Login failed"));
      toast.showError(
        error.response?.data?.message || "Login failed. Please try again."
      );
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

  // return <Maintenance>{loginContent}</Maintenance>;
  return loginContent;
}

export default Login;
