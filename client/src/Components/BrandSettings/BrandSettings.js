import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTeamLine,
  RiDeleteBinLine,
  RiCloseLine,
  RiShieldUserLine,
  RiUserAddLine,
} from "react-icons/ri";
import UserInterface from "../UserInterface/UserInterface";
import RoleSetting from "../RoleSetting/RoleSetting";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import "./BrandSettings.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";

const BrandSettings = ({ brand, onClose, onDelete, onSave }) => {
  const [showUserInterface, setShowUserInterface] = useState(false);
  const [showRoleSettings, setShowRoleSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settings, setSettings] = useState({
    autoJoinEnabled: brand.settings?.autoJoinEnabled || false,
    defaultRole: brand.settings?.defaultRole || "staff",
  });
  const [roles, setRoles] = useState([]);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    setSettings({
      name: brand.name || "",
      requiresApproval: brand.requiresApproval || false,
      isPublic: brand.isPublic || false,
      description: brand.description || "",
      logo: brand.logo || null,
      coverImage: brand.coverImage || null,
      roles: [],
    });

    fetchRoles();
  }, [brand]);

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get(
        `/roles/brands/${brand._id}/roles`
      );
      setRoles(response.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      showError("Failed to fetch roles");
    }
  };

  const handleSettingChange = (key, value, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const newSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(newSettings);

    if (brand._id) {
      onSave({
        _id: brand._id,
        settings: {
          ...brand.settings,
          ...newSettings,
        },
      });
    }
  };

  const handleDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (onDelete && brand._id) {
      onDelete(brand._id);
    }
    setShowDeleteConfirm(false);
  };

  const handleContainerClick = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  const handleJoinToggle = async () => {
    try {
      const response = await axiosInstance.put(
        `/brands/${brand._id}/settings`,
        {
          autoJoinEnabled: !settings.autoJoinEnabled,
          defaultRole: settings.defaultRole,
        }
      );

      setSettings((prev) => ({
        ...prev,
        autoJoinEnabled: !prev.autoJoinEnabled,
      }));

      showSuccess("Join settings updated successfully");
    } catch (error) {
      console.error("Error updating join settings:", error);
      showError("Failed to update join settings");
    }
  };

  const handleRoleChange = async (e) => {
    const newRole = e.target.value;

    try {
      const response = await axiosInstance.put(
        `/brands/${brand._id}/settings`,
        {
          autoJoinEnabled: settings.autoJoinEnabled,
          defaultRole: newRole,
        }
      );

      setSettings((prev) => ({
        ...prev,
        defaultRole: newRole,
      }));

      showSuccess("Default role updated successfully");
    } catch (error) {
      console.error("Error updating default role:", error);
      showError("Failed to update default role");
    }
  };

  const handleRoleSettingsClose = () => {
    setShowRoleSettings(false);
    fetchRoles(); // Refresh roles when returning from role settings
  };

  return (
    <div
      className="brand-settings-container"
      onClick={handleContainerClick}
      style={{
        isolation: "isolate",
        position: "absolute",
        inset: 0,
        zIndex: 1000,
        transform: "translateZ(1px)",
        backfaceVisibility: "hidden",
      }}
    >
      <div className="brand-settings-card">
        <div className="settings-header">
          <h2>{brand.name} Settings</h2>
          <motion.button
            className="close-btn"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <RiCloseLine />
          </motion.button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Team Management</h3>
            <motion.button
              className="settings-btn"
              onClick={() => setShowUserInterface(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RiTeamLine />
              <span>Manage Team Members</span>
            </motion.button>
          </div>

          <div className="settings-section">
            <h3>Role Management</h3>
            <motion.button
              className="settings-btn"
              onClick={() => setShowRoleSettings(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RiShieldUserLine />
              <span>Configure Roles</span>
            </motion.button>
          </div>

          <div className="settings-section settings-join">
            <h3>Join Settings</h3>
            <div className="setting-item">
              <motion.button
                className={`settings-btn ${
                  settings.autoJoinEnabled ? "active" : ""
                }`}
                onClick={handleJoinToggle}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RiUserAddLine />
                <span>Instant Join Access</span>
              </motion.button>
            </div>
            <div className="setting-item role-setting">
              <h4>Default Member Role</h4>
              <select
                value={settings.defaultRole}
                onChange={handleRoleChange}
                disabled={!settings.autoJoinEnabled}
                className="role-select"
              >
                {roles.length > 0 ? (
                  roles
                    .filter((role) => !role.isFounder)
                    .map((role) => (
                      <option key={role._id} value={role.name}>
                        {role.name}
                      </option>
                    ))
                ) : (
                  <option value={settings.defaultRole}>
                    {settings.defaultRole}
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="settings-section danger-zone">
            <h3>Danger Zone</h3>
            <motion.button
              className="delete-btn"
              onClick={handleDelete}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RiDeleteBinLine />
              <span>Delete Brand</span>
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showUserInterface && (
          <motion.div
            className="full-screen-panel"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            style={{ zIndex: 1100 }}
          >
            <UserInterface
              brand={brand}
              onClose={() => setShowUserInterface(false)}
            />
          </motion.div>
        )}
        {showRoleSettings && (
          <motion.div
            className="full-screen-panel"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            style={{ zIndex: 1100 }}
          >
            <RoleSetting brand={brand} onClose={handleRoleSettingsClose} />
          </motion.div>
        )}
        {showDeleteConfirm && (
          <motion.div
            className="delete-confirmation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
          >
            <motion.div
              className="delete-confirmation"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#151515",
                borderRadius: "12px",
                padding: "1.5rem",
                width: "90%",
                maxWidth: "400px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <h3>Delete Brand</h3>
              <p>
                Are you sure you want to delete this brand? This action cannot
                be undone.
              </p>
              <div className="confirmation-actions">
                <motion.button
                  className="cancel-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="confirm-delete-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    confirmDelete(e);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrandSettings;
