import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Settings.scss";
import DNS from "../DNS/DNS";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import { useNavigate } from "react-router-dom";
import {
  RiUserLine,
  RiLockPasswordLine,
  RiNotification3Line,
  RiPaletteLine,
  RiLogoutBoxRLine,
} from "react-icons/ri";

function Settings() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // State for user profile fields
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    birthday: "", // Storing as YYYY-MM-DD for input type="date"
  });

  // State for password change fields
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("profile"); // State to track active section

  // Populate form data on component mount
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        email: user.email || "",
        // Format birthday for date input (YYYY-MM-DD)
        birthday: user.birthday
          ? new Date(user.birthday).toISOString().split("T")[0]
          : "",
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axiosInstance.put(
        "/settings/user/profile",
        formData
      );
      setUser(response.data.user); // Update user context with the response
      toast.showSuccess("Profile updated successfully!");
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to update profile."
      );
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.showError("New passwords do not match.");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      // Add basic password length validation
      toast.showError("New password must be at least 6 characters long.");
      return;
    }
    setPasswordLoading(true);
    try {
      await axiosInstance.put("/settings/user/password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword, // Send confirm for validation consistency
      });
      toast.showSuccess("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }); // Clear fields
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to change password."
      );
    }
    setPasswordLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Function to handle section clicks and update active state
  const handleSectionClick = (section) => {
    setActiveSection(section);
    // Future: Could add logic here to fetch specific section data if needed
  };

  if (!user) {
    // Optionally handle case where user is not logged in, though RouteGuard should prevent this
    // You might want a proper loading spinner component here
    return <div className="loading-fullscreen">Loading user settings...</div>;
  }

  return (
    <div className="settings-page">
      <Navigation />
      <div className="settings-container">
        <h1 className="settings-title">Settings</h1>
        <div className="settings-content">
          <div className="settings-sidebar">
            <button
              className={`settings-menu-item ${
                activeSection === "profile" ? "active" : ""
              }`}
              onClick={() => handleSectionClick("profile")}
            >
              <RiUserLine /> Profile
            </button>
            <button
              className={`settings-menu-item ${
                activeSection === "account" ? "active" : ""
              }`}
              onClick={() => handleSectionClick("account")}
            >
              <RiLockPasswordLine /> Account
            </button>
            <button
              className={`settings-menu-item ${
                activeSection === "notifications" ? "active" : ""
              }`}
              onClick={() => handleSectionClick("notifications")}
            >
              <RiNotification3Line /> Notifications
            </button>
            <button
              className={`settings-menu-item ${
                activeSection === "appearance" ? "active" : ""
              }`}
              onClick={() => handleSectionClick("appearance")}
            >
              <RiPaletteLine /> Appearance
            </button>
            <button
              className="settings-menu-item logout-button"
              onClick={handleLogout}
            >
              <RiLogoutBoxRLine /> Logout
            </button>
          </div>
          <div className="settings-main-content">
            {/* Conditional Rendering based on activeSection */}
            {activeSection === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="settings-section profile-section"
              >
                <h2>Profile Settings</h2>
                <p>Manage your public profile information.</p>
                <form onSubmit={handleProfileUpdate}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName">Last Name</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group username-group">
                      <label htmlFor="username">Username</label>
                      <div className="username-wrapper">
                        <span className="username-prefix">@</span>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          className="username-input"
                          value={formData.username}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <p className="input-hint">
                        Usernames can only be changed once every 14 days.
                        {/* Safely check and format the date */}
                        {user.lastUsernameChange &&
                          typeof user.lastUsernameChange === "string" &&
                          new Date(
                            new Date(user.lastUsernameChange).getTime() +
                              14 * 24 * 60 * 60 * 1000
                          ) > Date.now() &&
                          ` Next change possible on: ${new Date(
                            new Date(user.lastUsernameChange).getTime() +
                              14 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString()}`}
                        {/* Handle cases where it might already be a Date object (less likely with JSON transfer) */}
                        {user.lastUsernameChange &&
                          typeof user.lastUsernameChange === "object" &&
                          user.lastUsernameChange.getTime &&
                          new Date(
                            user.lastUsernameChange.getTime() +
                              14 * 24 * 60 * 60 * 1000
                          ) > Date.now() &&
                          ` Next change possible on: ${new Date(
                            user.lastUsernameChange.getTime() +
                              14 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        // Consider making email read-only if needed: readOnly
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="birthday">Birthday</label>
                      <input
                        type="date"
                        id="birthday"
                        name="birthday"
                        value={formData.birthday}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    {/* Add placeholder for potential future fields */}
                    <div className="form-group"></div>
                  </div>
                  <motion.button
                    type="submit"
                    className="save-button"
                    disabled={loading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      "Save Profile Changes"
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {activeSection === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="settings-section password-section"
              >
                <h2>Account Settings</h2>
                <p>Manage your account security.</p>
                {/* Password Change Form */}
                <form onSubmit={handleChangePassword}>
                  <h3>Change Password</h3>
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <motion.button
                    type="submit"
                    className="save-button"
                    disabled={passwordLoading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {passwordLoading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      "Change Password"
                    )}
                  </motion.button>
                </form>
                {/* Add Account Deletion section here if needed */}
              </motion.div>
            )}

            {/* Placeholder sections for Notifications and Appearance */}
            {activeSection === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="settings-section"
              >
                <h2>Notifications</h2>
                <p>Manage how you receive notifications. (Coming Soon)</p>
              </motion.div>
            )}
            {activeSection === "appearance" && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="settings-section"
              >
                <h2>Appearance</h2>
                <p>Customize the look and feel of the app. (Coming Soon)</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Settings;
