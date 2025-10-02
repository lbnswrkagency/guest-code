import React, { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTeamLine,
  RiDeleteBinLine,
  RiCloseLine,
  RiShieldUserLine,
  RiUserAddLine,
  RiBarChart2Line,
} from "react-icons/ri";
import UserInterface from "../UserInterface/UserInterface";
import RoleSetting from "../RoleSetting/RoleSetting";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import "./BrandSettings.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import AuthContext from "../../contexts/AuthContext";

const BrandSettings = ({ brand, onClose, onDelete, onSave, userPermissions }) => {
  const [showUserInterface, setShowUserInterface] = useState(false);
  const [showRoleSettings, setShowRoleSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settings, setSettings] = useState({
    autoJoinEnabled: brand.settings?.autoJoinEnabled || false,
    defaultRole: brand.settings?.defaultRole || "staff",
  });
  const [roles, setRoles] = useState([]);
  const [metaPixelId, setMetaPixelId] = useState(brand.metaPixelId || "");
  const [isSavingPixel, setIsSavingPixel] = useState(false);

  // Spotify integration states
  const [spotifyConfig, setSpotifyConfig] = useState({
    spotifyClientId: brand.spotifyClientId || "",
    spotifyClientSecret: brand.spotifyClientSecret || "",
    spotifyPlaylistId: brand.spotifyPlaylistId || "",
  });
  const [isSavingSpotify, setIsSavingSpotify] = useState(false);

  const { showSuccess, showError } = useToast();
  const { user } = useContext(AuthContext);

  // Check if user is the brand owner
  const isOwner = () => {
    if (!user || !brand) return false;
    const ownerId = typeof brand.owner === "object" ? brand.owner._id : brand.owner;
    return ownerId === user._id;
  };

  // Check if user has team management permissions
  const hasTeamManagePermission = () => {
    return userPermissions?.team?.manage === true || isOwner();
  };

  // Check if user has full brand settings access (owner only)
  const hasFullSettingsAccess = () => {
    return isOwner();
  };

  useEffect(() => {
    setSettings({
      name: brand.name || "",
      requiresApproval: brand.requiresApproval || false,
      isPublic: brand.isPublic || false,
      description: brand.description || "",
      logo: brand.logo || null,
      coverImage: brand.coverImage || null,
      roles: [],
      // Keep the join settings that are actually used by the component
      autoJoinEnabled: brand.settings?.autoJoinEnabled || false,
      defaultRole: brand.settings?.defaultRole || "Member",
    });

    fetchRoles();
  }, [brand]);

  useEffect(() => {
    setMetaPixelId(brand.metaPixelId || "");
  }, [brand.metaPixelId]);

  useEffect(() => {
    setSpotifyConfig({
      spotifyClientId: brand.spotifyClientId || "",
      spotifyClientSecret: brand.spotifyClientSecret || "",
      spotifyPlaylistId: brand.spotifyPlaylistId || "",
    });
  }, [
    brand.spotifyClientId,
    brand.spotifyClientSecret,
    brand.spotifyPlaylistId,
  ]);

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
      // Keep the current defaultRole when toggling autoJoinEnabled
      const newAutoJoinEnabled = !settings.autoJoinEnabled;
      
      const response = await axiosInstance.put(
        `/brands/${brand._id}/settings`,
        {
          autoJoinEnabled: newAutoJoinEnabled,
          defaultRole: settings.defaultRole, // Preserve current defaultRole
        }
      );

      setSettings((prev) => ({
        ...prev,
        autoJoinEnabled: newAutoJoinEnabled,
        // Don't change defaultRole - keep it as is
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

  const handleMetaPixelChange = (e) => {
    setMetaPixelId(e.target.value);
  };

  const saveMetaPixelId = async () => {
    if (!brand || !brand._id) {
      showError("Brand information is missing.");
      return;
    }
    setIsSavingPixel(true);
    try {
      const response = await axiosInstance.put(
        `/brands/${brand._id}/metapixel`,
        { metaPixelId }
      );
      showSuccess(
        response.data.message || "Meta Pixel ID updated successfully!"
      );
      if (onSave) {
        const updatedBrandData = {
          _id: brand._id,
          metaPixelId: response.data.metaPixelId,
        };
        onSave(updatedBrandData, true);
      }
    } catch (error) {
      console.error("Error updating Meta Pixel ID:", error);
      showError(
        error.response?.data?.message || "Failed to update Meta Pixel ID."
      );
    } finally {
      setIsSavingPixel(false);
    }
  };

  const handleSpotifyConfigChange = (e) => {
    const { name, value } = e.target;
    setSpotifyConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveSpotifyConfig = async () => {
    if (!brand || !brand._id) {
      showError("Brand information is missing.");
      return;
    }
    setIsSavingSpotify(true);
    try {
      const response = await axiosInstance.put(
        `/brands/${brand._id}/spotify-config`,
        spotifyConfig
      );
      showSuccess(
        response.data.message || "Spotify configuration updated successfully!"
      );

      // Optionally update the brand object in the parent component if needed
      if (onSave) {
        // Create a minimal update object
        const updatedBrandData = {
          _id: brand._id,
          ...spotifyConfig,
          spotifyConfigured: response.data.spotifyConfigured,
        };
        onSave(updatedBrandData, true); // Pass flag indicating only spotify update
      }
    } catch (error) {
      console.error("Error updating Spotify configuration:", error);
      showError(
        error.response?.data?.message ||
          "Failed to update Spotify configuration."
      );
    } finally {
      setIsSavingSpotify(false);
    }
  };

  return (
    <div
      className="brand-settings-container"
      onClick={handleContainerClick}
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
          {/* Team Management - Visible if user has team.manage permission */}
          {hasTeamManagePermission() && (
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
          )}

          {/* Role Management - Team managers and owners */}
          {hasTeamManagePermission() && (
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
          )}

          {/* Join Settings - Owner only */}
          {hasFullSettingsAccess() && (
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
          )}

          {/* Analytics Section - Owner only */}
          {hasFullSettingsAccess() && (
            <div className="settings-section settings-analytics">
              <h3>Analytics</h3>
              <div className="setting-item meta-pixel-setting">
                <RiBarChart2Line className="setting-icon" />
                <div className="setting-details">
                  <h4>Meta Pixel ID</h4>
                  <p>
                    Track profile views and conversions with your Facebook Pixel.
                  </p>
                  <div className="meta-pixel-input-group">
                    <input
                      type="text"
                      placeholder="Enter your Meta Pixel ID"
                      value={metaPixelId}
                      onChange={handleMetaPixelChange}
                      className="meta-pixel-input"
                    />
                    <motion.button
                      onClick={saveMetaPixelId}
                      disabled={isSavingPixel}
                      className="save-pixel-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isSavingPixel ? "Saving..." : "Save"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Spotify Integration Section - Owner only */}
          {hasFullSettingsAccess() && (
            <div className="settings-section settings-spotify">
              <h3>Spotify Integration</h3>
              <div className="setting-item spotify-setting">
                <div className="setting-details">
                  <h4>Spotify API Credentials</h4>
                  <p>
                    Connect your Spotify account to display playlists on your
                    brand profile.
                  </p>
                  <div className="spotify-input-fields">
                    <div className="form-group">
                      <label>Client ID</label>
                      <input
                        type="text"
                        name="spotifyClientId"
                        placeholder="Enter Spotify Client ID"
                        value={spotifyConfig.spotifyClientId}
                        onChange={handleSpotifyConfigChange}
                        className="spotify-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Client Secret</label>
                      <input
                        type="password"
                        name="spotifyClientSecret"
                        placeholder="Enter Spotify Client Secret"
                        value={spotifyConfig.spotifyClientSecret}
                        onChange={handleSpotifyConfigChange}
                        className="spotify-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Playlist ID</label>
                      <input
                        type="text"
                        name="spotifyPlaylistId"
                        placeholder="Enter Spotify Playlist ID"
                        value={spotifyConfig.spotifyPlaylistId}
                        onChange={handleSpotifyConfigChange}
                        className="spotify-input"
                      />
                      <small className="help-text">
                        The ID is the part after "/playlist/" in your Spotify
                        playlist URL
                      </small>
                    </div>
                  </div>
                  <motion.button
                    onClick={saveSpotifyConfig}
                    disabled={isSavingSpotify}
                    className="save-spotify-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSavingSpotify ? "Saving..." : "Save Spotify Configuration"}
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone - Owner only */}
          {hasFullSettingsAccess() && (
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
          )}

          {/* Show message if user only has team management access */}
          {hasTeamManagePermission() && !hasFullSettingsAccess() && (
            <div className="settings-section limited-access-notice">
              <p>You have access to team management features. Additional brand settings are available to the brand owner.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showUserInterface && (
          <motion.div
            className="user-interface-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            style={{ zIndex: 1100 }}
            onClick={() => setShowUserInterface(false)}
          >
            <motion.div
              className="user-interface-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <UserInterface
                brand={brand}
                onClose={() => setShowUserInterface(false)}
              />
            </motion.div>
          </motion.div>
        )}
        {showRoleSettings && (
          <motion.div
            className="role-settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            style={{ zIndex: 1100 }}
            onClick={() => setShowRoleSettings(false)}
          >
            <motion.div
              className="role-settings-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <RoleSetting brand={brand} onClose={handleRoleSettingsClose} />
            </motion.div>
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
