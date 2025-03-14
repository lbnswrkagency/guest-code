import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.scss";
import AuthContext from "../../../contexts/AuthContext";
import Navigation from "../../Navigation/Navigation";
import { useToast } from "../../Toast/ToastContext";
import { useDispatch } from "react-redux";
import { setUser, setLoading, setError } from "../../../redux/userSlice";
import { addEventsToBrand } from "../../../redux/brandSlice";
import Maintenance from "../../Maintenance/Maintenance";
import axiosInstance from "../../../utils/axiosConfig";
import { addRolesForBrand } from "../../../redux/permissionsSlice";

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

  // Helper function to fetch roles for a brand
  const fetchRolesForBrand = async (brandId) => {
    try {
      const response = await axiosInstance.get(
        `/roles/brands/${brandId}/roles`
      );
      if (response.data && Array.isArray(response.data)) {
        // Store roles for this brand in Redux
        dispatch(
          addRolesForBrand({
            brandId,
            roles: response.data,
          })
        );

        return response.data;
      }
    } catch (error) {
      console.error(`Error fetching roles for brand ${brandId}:`, error);
    }
    return [];
  };

  // Helper function to fetch events for a brand
  const fetchEventsForBrand = async (brandId) => {
    try {
      console.log(`[Login] Fetching events for brand ${brandId}...`);

      // Step 1: Fetch parent events first
      const url = `/events/brand/${brandId}`;
      console.log(`[Login] Requesting parent events URL: ${url}`);

      const response = await axiosInstance.get(url);

      console.log(`[Login] Parent events API response for ${brandId}:`, {
        status: response.status,
        dataCount: Array.isArray(response.data)
          ? response.data.length
          : "Not an array",
      });

      if (response.data && Array.isArray(response.data)) {
        // Step 2: For each parent event that is weekly, fetch its child events
        const parentEvents = [...response.data];
        const allEvents = [...parentEvents];

        // Find weekly events that might have children
        const weeklyEvents = parentEvents.filter((event) => event.isWeekly);

        if (weeklyEvents.length > 0) {
          console.log(
            `[Login] Found ${weeklyEvents.length} weekly events, fetching children`
          );

          // Fetch children for each weekly parent event
          for (const weeklyEvent of weeklyEvents) {
            try {
              const childUrl = `/events/children/${weeklyEvent._id}`;
              console.log(
                `[Login] Requesting child events for ${weeklyEvent.title}: ${childUrl}`
              );

              const childResponse = await axiosInstance.get(childUrl);

              if (childResponse.data && Array.isArray(childResponse.data)) {
                console.log(
                  `[Login] Found ${childResponse.data.length} child events for ${weeklyEvent.title}`
                );

                // Add children to our events array
                allEvents.push(...childResponse.data);
              }
            } catch (childError) {
              console.error(
                `[Login] Error fetching child events for event ${weeklyEvent._id}:`,
                childError.message
              );
            }
          }
        }

        // Now dispatch all events (parents and children) to Redux
        dispatch(
          addEventsToBrand({
            brandId,
            events: allEvents,
          })
        );

        console.log(
          `[Login] Fetched and stored ${allEvents.length} events (${
            parentEvents.length
          } parents + ${
            allEvents.length - parentEvents.length
          } children) for brand ${brandId}`
        );

        return allEvents;
      } else {
        console.log(
          `[Login] Unexpected response format for brand ${brandId}:`,
          typeof response.data
        );
        return [];
      }
    } catch (error) {
      console.error(
        `[Login] Error fetching events for brand ${brandId}:`,
        error.message,
        error.response?.status,
        error.response?.data
      );
    }
    return [];
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

      // Now fetch user's roles if user has any brands
      if (fullUserData.brands && fullUserData.brands.length > 0) {
        console.log("[Login] Found brands, fetching roles for each brand");

        // Fetch roles for each brand
        for (const brand of fullUserData.brands) {
          if (brand._id) {
            await fetchRolesForBrand(brand._id);
            console.log(
              `[Login] Fetched and stored roles for brand ${brand.name}`
            );

            // Also fetch events for each brand
            await fetchEventsForBrand(brand._id);
          }
        }
      }

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
