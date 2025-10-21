import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { setCoHostedEvents } from "../../../redux/coHostedEventsSlice";
import Maintenance from "../../Maintenance/Maintenance";
import notificationManager from "../../../utils/notificationManager";
import EmailVerificationModal from "../../EmailVerification/EmailVerificationModal";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const dispatch = useDispatch();

  // Clear any existing auth notifications when the component mounts
  useEffect(() => {
    notificationManager.clearAllAuthNotifications();
  }, []);

  // Check for error messages in location state
  useEffect(() => {
    if (location.state?.message) {
      // Set the message in auth message state
      setAuthMessage(location.state.message);

      // Show the message as a toast
      toast.showError(location.state.message);

      // Remove the message from location state to prevent showing multiple times
      const newState = { ...location.state };
      delete newState.message;
      window.history.replaceState(newState, document.title);
    }
  }, [location.state, toast]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    dispatch(setLoading());

    // Clear any existing auth notifications before attempting login
    notificationManager.clearAllAuthNotifications();

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

      // Store co-hosted events if available
      if (fullUserData.coHostedEvents && Array.isArray(fullUserData.coHostedEvents)) {
        dispatch(setCoHostedEvents(fullUserData.coHostedEvents));
      }

      // Determine where to navigate
      const redirectTo = location.state?.from || `/@${fullUserData.username}`;
      navigate(redirectTo);
    } catch (error) {
      dispatch(setError(error.message || "Login failed"));
      
      // Check if this is a verification error
      if (error.response?.data?.isVerificationError) {
        setVerificationEmail(formData.email);
        setShowVerificationModal(true);
      } else {
        toast.showError(
          error.response?.data?.message || "Login failed. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseVerificationModal = () => {
    setShowVerificationModal(false);
    setVerificationEmail("");
  };

  const loginContent = (
    <div className="login">
      <Navigation />
      
      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={handleCloseVerificationModal}
        email={verificationEmail}
      />

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

        {authMessage && (
          <motion.div
            className="auth-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {authMessage}
          </motion.div>
        )}

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

          <div className="auth-links">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <span onClick={() => navigate("/register")}>Create account</span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <span onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </span>
            </motion.p>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );

  // return <Maintenance>{loginContent}</Maintenance>;
  return loginContent;
}

export default Login;
