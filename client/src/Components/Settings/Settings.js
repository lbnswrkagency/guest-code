import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Settings.scss";
import DNS from "../DNS/DNS";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import Navigation from "../Navigation/Navigation";
import { useNavigate } from "react-router-dom";

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
    toast.showInfo("Profile update endpoint is not yet implemented.");
    // TODO: Implement API call to PUT /api/settings/user/profile
    // try {
    //   const response = await axiosInstance.put("/settings/user/profile", formData);
    //   setUser(response.data.user); // Assuming backend returns updated user
    //   toast.showSuccess("Profile updated successfully!");
    // } catch (error) {
    //   toast.showError(error.response?.data?.message || "Failed to update profile.");
    // }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.showError("New passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    toast.showInfo("Password change endpoint is not yet implemented.");
    // TODO: Implement API call to PUT /api/settings/user/password
    // try {
    //   await axiosInstance.put("/settings/user/password", {
    //     currentPassword: passwordData.currentPassword,
    //     newPassword: passwordData.newPassword,
    //   });
    //   toast.showSuccess("Password changed successfully!");
    //   setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" }); // Clear fields
    // } catch (error) {
    //   toast.showError(error.response?.data?.message || "Failed to change password.");
    // }
    setPasswordLoading(false);
  };

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  if (!user) {
    // Optional: Redirect to login or show loading/message
    return <div>Loading user data...</div>;
  }

  return (
    <div className="page-wrapper">
      <Navigation title="Settings" onBack={handleBack} />
      <motion.div
        className="settings-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Profile Settings Section */}
        <form
          onSubmit={handleProfileUpdate}
          className="settings-section profile-settings"
        >
          <h2>Profile Information</h2>
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
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
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
          </div>
          <motion.button
            type="submit"
            className="button primary-button"
            disabled={loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? "Saving..." : "Save Profile Changes"}
          </motion.button>
        </form>

        {/* Password Change Section */}
        <form
          onSubmit={handleChangePassword}
          className="settings-section password-settings"
        >
          <h2>Change Password</h2>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
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
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>
          <motion.button
            type="submit"
            className="button primary-button"
            disabled={passwordLoading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {passwordLoading ? "Changing..." : "Change Password"}
          </motion.button>
        </form>

        {/* DNS Settings Section - Keep if needed */}
        {/* <div className="settings-section dns-settings">
          <h2>DNS Settings</h2>
          <DNS />
        </div> */}

        {/* Add other settings sections here (e.g., Notifications, Account Deletion) */}

        {/* Logout Button */}
        <div className="settings-section logout-section">
          <motion.button
            onClick={logout}
            className="button danger-button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Logout
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default Settings;
