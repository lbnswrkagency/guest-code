import React, { useState, useEffect, useContext } from "react";
import { useDispatch } from "react-redux";
import { updateBrand } from "../../redux/brandSlice";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTeamLine,
  RiDeleteBinLine,
  RiCloseLine,
  RiShieldUserLine,
  RiUserAddLine,
  RiBarChart2Line,
  RiUpload2Line,
  RiVideoUploadLine,
  RiGlobalLine,
  RiCodeLine,
} from "react-icons/ri";
import TeamManagement from "../TeamManagement/TeamManagement";
import RoleSetting from "../RoleSetting/RoleSetting";
import CodeCreator from "../CodeCreator/CodeCreator";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import DropboxFolderBrowser from "../DropboxFolderBrowser/DropboxFolderBrowser";
import "./BrandSettings.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import AuthContext from "../../contexts/AuthContext";
import { 
  getAvailablePlaceholders, 
  previewPathStructure, 
  isValidPathStructure 
} from "../../utils/dropboxUtils";

const BrandSettings = ({ brand, onClose, onDelete, onSave, userPermissions }) => {
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showRoleSettings, setShowRoleSettings] = useState(false);
  const [showCodeCreator, setShowCodeCreator] = useState(false);
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

  // Dropbox integration states
  const [dropboxConfig, setDropboxConfig] = useState({
    baseFolder: brand.dropboxBaseFolder || "",
    dateFormat: brand.dropboxDateFormat || "YYYYMMDD",
    pathStructure: brand.dropboxPathStructure || "/{YYYYMMDD}/photos",
    videoPathStructure: brand.dropboxVideoPathStructure || "/{YYYYMMDD}/videos",
    photoSubfolder: brand.dropboxPhotoSubfolder || "",
    videoSubfolder: brand.dropboxVideoSubfolder || "",
  });

  // Guest Upload settings states
  const [guestUploadConfig, setGuestUploadConfig] = useState({
    uploadFolder: brand.guestUploadFolder || "",
    uploadEnabled: brand.guestUploadEnabled || false,
  });
  const [isSavingGuestUpload, setIsSavingGuestUpload] = useState(false);

  // Available date formats for selector
  const dateFormats = [
    { value: "YYYYMMDD", label: "YYYYMMDD", example: () => {
      const d = new Date();
      return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    }},
    { value: "DDMMYYYY", label: "DDMMYYYY", example: () => {
      const d = new Date();
      return `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
    }},
    { value: "DDMMYY", label: "DDMMYY", example: () => {
      const d = new Date();
      return `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
    }},
    { value: "MMDDYYYY", label: "MMDDYYYY", example: () => {
      const d = new Date();
      return `${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${d.getFullYear()}`;
    }},
    { value: "MMDDYY", label: "MMDDYY", example: () => {
      const d = new Date();
      return `${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
    }},
  ];
  const [isSavingDropbox, setIsSavingDropbox] = useState(false);
  const [showDropboxHelp, setShowDropboxHelp] = useState(false);
  const [pathStructureError, setPathStructureError] = useState("");
  const [videoPathStructureError, setVideoPathStructureError] = useState("");

  const { showSuccess, showError } = useToast();
  const { user } = useContext(AuthContext);
  const dispatch = useDispatch();

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

  // Sync dropboxConfig when brand data changes/loads
  useEffect(() => {
    setDropboxConfig({
      baseFolder: brand.dropboxBaseFolder || "",
      dateFormat: brand.dropboxDateFormat || "YYYYMMDD",
      pathStructure: brand.dropboxPathStructure || "/{YYYYMMDD}/photos",
      videoPathStructure: brand.dropboxVideoPathStructure || "/{YYYYMMDD}/videos",
      photoSubfolder: brand.dropboxPhotoSubfolder || "",
      videoSubfolder: brand.dropboxVideoSubfolder || "",
    });
  }, [
    brand.dropboxBaseFolder,
    brand.dropboxDateFormat,
    brand.dropboxPathStructure,
    brand.dropboxVideoPathStructure,
    brand.dropboxPhotoSubfolder,
    brand.dropboxVideoSubfolder,
  ]);

  // Sync guestUploadConfig when brand data changes/loads
  useEffect(() => {
    setGuestUploadConfig({
      uploadFolder: brand.guestUploadFolder || "",
      uploadEnabled: brand.guestUploadEnabled || false,
    });
  }, [brand.guestUploadFolder, brand.guestUploadEnabled]);

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

  const saveDropboxConfig = async () => {
    if (!brand || !brand._id) {
      showError("Brand information is missing.");
      return;
    }

    // Validate photo path structure before saving
    if (dropboxConfig.pathStructure && !isValidPathStructure(dropboxConfig.pathStructure)) {
      showError("Invalid photo path structure. Must contain valid date placeholders.");
      return;
    }

    // Validate video path structure before saving
    if (dropboxConfig.videoPathStructure && !isValidPathStructure(dropboxConfig.videoPathStructure)) {
      showError("Invalid video path structure. Must contain valid date placeholders.");
      return;
    }

    setIsSavingDropbox(true);
    try {
      const response = await axiosInstance.put(`/brands/${brand._id}`, {
        dropboxBaseFolder: dropboxConfig.baseFolder,
        dropboxDateFormat: dropboxConfig.dateFormat,
        dropboxPathStructure: dropboxConfig.pathStructure,
        dropboxVideoPathStructure: dropboxConfig.videoPathStructure,
        dropboxPhotoSubfolder: dropboxConfig.photoSubfolder,
        dropboxVideoSubfolder: dropboxConfig.videoSubfolder,
      });

      showSuccess("Dropbox configuration updated successfully!");

      // Update the brand object in the parent component if needed
      if (onSave) {
        const updatedBrandData = {
          ...brand,
          dropboxBaseFolder: dropboxConfig.baseFolder,
          dropboxDateFormat: dropboxConfig.dateFormat,
          dropboxPathStructure: dropboxConfig.pathStructure,
          dropboxVideoPathStructure: dropboxConfig.videoPathStructure,
          dropboxPhotoSubfolder: dropboxConfig.photoSubfolder,
          dropboxVideoSubfolder: dropboxConfig.videoSubfolder,
        };
        onSave(updatedBrandData, true);
      }
    } catch (error) {
      console.error("Error updating Dropbox configuration:", error);
      showError(
        error.response?.data?.message ||
          "Failed to update Dropbox configuration."
      );
    } finally {
      setIsSavingDropbox(false);
    }
  };

  const saveGuestUploadConfig = async () => {
    if (!brand || !brand._id) {
      showError("Brand information is missing.");
      return;
    }

    setIsSavingGuestUpload(true);
    try {
      const response = await axiosInstance.put(
        `/dropbox/brand/${brand._id}/upload-settings`,
        {
          guestUploadFolder: guestUploadConfig.uploadFolder,
          guestUploadEnabled: guestUploadConfig.uploadEnabled,
        }
      );

      showSuccess("Guest upload settings updated successfully!");

      // Update Redux store to persist settings across navigation
      dispatch(updateBrand({
        brandId: brand._id,
        brandData: {
          guestUploadFolder: guestUploadConfig.uploadFolder,
          guestUploadEnabled: guestUploadConfig.uploadEnabled,
        }
      }));

      // Update the brand object in the parent component if needed
      if (onSave) {
        const updatedBrandData = {
          ...brand,
          guestUploadFolder: guestUploadConfig.uploadFolder,
          guestUploadEnabled: guestUploadConfig.uploadEnabled,
        };
        onSave(updatedBrandData, true);
      }
    } catch (error) {
      console.error("Error updating guest upload settings:", error);
      showError(
        error.response?.data?.message ||
          "Failed to update guest upload settings."
      );
    } finally {
      setIsSavingGuestUpload(false);
    }
  };

  const handleGuestUploadToggle = () => {
    setGuestUploadConfig((prev) => ({
      ...prev,
      uploadEnabled: !prev.uploadEnabled,
    }));
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
                onClick={() => setShowTeamManagement(true)}
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

          {/* Code Templates - Owner only */}
          {hasFullSettingsAccess() && (
            <div className="settings-section">
              <h3>Code Templates</h3>
              <motion.button
                className="settings-btn"
                onClick={() => setShowCodeCreator(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RiCodeLine />
                <span>Manage Code Templates</span>
              </motion.button>
              <p className="section-description">
                Create and manage code templates for all your events. These templates
                can be activated per event and assigned to team roles.
              </p>
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

          {/* Dropbox Integration Section - Owner only */}
          {hasFullSettingsAccess() && (
            <div className="settings-section settings-dropbox">
              <h3>
                <RiUpload2Line />
                Dropbox Integration
              </h3>
              <div className="setting-item dropbox-setting">
                <div className="setting-details">
                  <h4>Dropbox Configuration</h4>
                  <p>
                    Configure your Dropbox folder structure for automatic event gallery path generation.
                    Connect your Dropbox account to organize event photos automatically.
                  </p>

                  <div className="dropbox-config">
                    <div className="config-section">
                      <label>Base Folder</label>
                      <DropboxFolderBrowser
                        selectedPath={dropboxConfig.baseFolder}
                        onSelectPath={(path) => {
                          setDropboxConfig(prev => ({ ...prev, baseFolder: path }));
                        }}
                        placeholder="Select your brand's base folder in Dropbox"
                      />
                      <small className="help-text">
                        This is the root folder in your Dropbox where all event folders will be organized.
                      </small>
                    </div>

                    <div className="config-section">
                      <label>Date Format</label>
                      <div className="date-format-selector">
                        {dateFormats.map((format) => (
                          <button
                            key={format.value}
                            type="button"
                            className={`date-format-chip ${dropboxConfig.dateFormat === format.value ? 'active' : ''}`}
                            onClick={() => {
                              setDropboxConfig(prev => ({ ...prev, dateFormat: format.value }));
                            }}
                          >
                            {format.label}
                          </button>
                        ))}
                      </div>
                      <small className="help-text date-format-sample">
                        Sample: {dateFormats.find(f => f.value === dropboxConfig.dateFormat)?.example()}
                      </small>
                    </div>

                    <div className="config-section">
                      <label>Photo Path Structure</label>
                      <div className="path-structure-input">
                        <div className="input-wrapper">
                          <RiUpload2Line />
                          <input
                            type="text"
                            placeholder="e.g., /{YYYYMMDD}/photos"
                            value={dropboxConfig.pathStructure}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDropboxConfig(prev => ({ ...prev, pathStructure: value }));

                              // Validate path structure
                              if (value && !isValidPathStructure(value)) {
                                setPathStructureError("Invalid path structure. Must contain valid date placeholders.");
                              } else {
                                setPathStructureError("");
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="help-button"
                            onClick={() => setShowDropboxHelp(!showDropboxHelp)}
                            title="Show available placeholders"
                          >
                            ?
                          </button>
                        </div>

                        {pathStructureError && (
                          <div className="error-message">{pathStructureError}</div>
                        )}

                        {/* Preview */}
                        {dropboxConfig.baseFolder && dropboxConfig.pathStructure && (
                          <div className="path-preview">
                            <span className="preview-label">Preview: </span>
                            <code>
                              {dropboxConfig.baseFolder}
                              {previewPathStructure(dropboxConfig.pathStructure, new Date(), dropboxConfig.dateFormat, dropboxConfig.photoSubfolder)}
                            </code>
                          </div>
                        )}
                      </div>
                      <small className="help-text">
                        Define how photo gallery folders are organized using date placeholders.
                      </small>
                    </div>

                    <div className="config-section">
                      <label>Photo Subfolder (Last Folder)</label>
                      <input
                        type="text"
                        placeholder="e.g., branded, raw, edited"
                        value={dropboxConfig.photoSubfolder}
                        onChange={(e) => {
                          setDropboxConfig(prev => ({ ...prev, photoSubfolder: e.target.value }));
                        }}
                        className="subfolder-input"
                      />
                      <small className="help-text">
                        Optional: Final folder name to append (e.g., "branded" results in /photos/branded)
                      </small>
                    </div>

                    <div className="config-section">
                      <label>Video Path Structure</label>
                      <div className="path-structure-input">
                        <div className="input-wrapper">
                          <RiUpload2Line />
                          <input
                            type="text"
                            placeholder="e.g., /{YYYYMMDD}/videos"
                            value={dropboxConfig.videoPathStructure}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDropboxConfig(prev => ({ ...prev, videoPathStructure: value }));

                              // Validate video path structure
                              if (value && !isValidPathStructure(value)) {
                                setVideoPathStructureError("Invalid path structure. Must contain valid date placeholders.");
                              } else {
                                setVideoPathStructureError("");
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="help-button"
                            onClick={() => setShowDropboxHelp(!showDropboxHelp)}
                            title="Show available placeholders"
                          >
                            ?
                          </button>
                        </div>

                        {videoPathStructureError && (
                          <div className="error-message">{videoPathStructureError}</div>
                        )}

                        {/* Preview */}
                        {dropboxConfig.baseFolder && dropboxConfig.videoPathStructure && (
                          <div className="path-preview">
                            <span className="preview-label">Preview: </span>
                            <code>
                              {dropboxConfig.baseFolder}
                              {previewPathStructure(dropboxConfig.videoPathStructure, new Date(), dropboxConfig.dateFormat, dropboxConfig.videoSubfolder)}
                            </code>
                          </div>
                        )}
                      </div>
                      <small className="help-text">
                        Define how video gallery folders are organized using date placeholders.
                      </small>
                    </div>

                    <div className="config-section">
                      <label>Video Subfolder (Last Folder)</label>
                      <input
                        type="text"
                        placeholder="e.g., branded, raw, edited"
                        value={dropboxConfig.videoSubfolder}
                        onChange={(e) => {
                          setDropboxConfig(prev => ({ ...prev, videoSubfolder: e.target.value }));
                        }}
                        className="subfolder-input"
                      />
                      <small className="help-text">
                        Optional: Final folder name to append (e.g., "branded" results in /videos/branded)
                      </small>
                    </div>

                    {/* Help panel */}
                    <AnimatePresence>
                      {showDropboxHelp && (
                        <motion.div
                          className="dropbox-help-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <h4>Available Placeholders:</h4>
                          <div className="placeholders-list">
                            {getAvailablePlaceholders().map((item) => (
                              <div key={item.placeholder} className="placeholder-item">
                                <code onClick={() => {
                                  const currentValue = dropboxConfig.pathStructure;
                                  const newValue = currentValue + item.placeholder;
                                  setDropboxConfig(prev => ({ ...prev, pathStructure: newValue }));
                                }}>
                                  {item.placeholder}
                                </code>
                                <span className="placeholder-desc">{item.description}</span>
                                <span className="placeholder-example">Example: {item.example}</span>
                              </div>
                            ))}
                          </div>
                          <div className="help-examples">
                            <h5>Examples:</h5>
                            <div className="example-item">
                              <code>/&#123;YYYYMMDD&#125;/photos</code>
                              <span>→ /20251227/photos</span>
                            </div>
                            <div className="example-item">
                              <code>/Galleries/&#123;YYYY&#125;/&#123;MM&#125;/Event-&#123;DD&#125;</code>
                              <span>→ /Galleries/2025/12/Event-27</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      className="save-btn"
                      onClick={saveDropboxConfig}
                      disabled={isSavingDropbox || !!pathStructureError || !!videoPathStructureError}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSavingDropbox ? (
                        <>
                          <div className="loading-spinner" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <RiUpload2Line />
                          Save Dropbox Configuration
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guest Video Upload Section - Owner only */}
          {hasFullSettingsAccess() && (
            <div className="settings-section settings-guest-upload">
              <h3>
                <RiVideoUploadLine />
                Guest Video Upload
              </h3>
              <div className="setting-item guest-upload-setting">
                <div className="setting-details">
                  <h4>Video Upload Configuration</h4>
                  <p>
                    Allow guests and team members to upload videos directly to your
                    Dropbox. Perfect for collecting event footage from attendees.
                  </p>

                  <div className="guest-upload-config">
                    <div className="config-section">
                      <label>Upload Folder</label>
                      <DropboxFolderBrowser
                        selectedPath={guestUploadConfig.uploadFolder}
                        onSelectPath={(path) => {
                          setGuestUploadConfig(prev => ({ ...prev, uploadFolder: path }));
                        }}
                        placeholder="Select folder for guest uploads"
                      />
                      <small className="help-text">
                        All uploaded videos will be saved to this folder in your Dropbox.
                      </small>
                    </div>

                    <div className="config-section">
                      <div className="toggle-setting">
                        <div className="toggle-info">
                          <RiGlobalLine className="toggle-icon" />
                          <div>
                            <h5>Allow Public Uploads</h5>
                            <p>Enable guests (non-team members) to upload videos</p>
                          </div>
                        </div>
                        <motion.button
                          className={`toggle-btn ${guestUploadConfig.uploadEnabled ? "active" : ""}`}
                          onClick={handleGuestUploadToggle}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="toggle-track">
                            <span className="toggle-thumb" />
                          </span>
                        </motion.button>
                      </div>
                      <small className="help-text">
                        When enabled, a "Share Your Moments" button will appear on your event pages.
                        Team members can always upload regardless of this setting.
                      </small>
                    </div>

                    <motion.button
                      className="save-btn"
                      onClick={saveGuestUploadConfig}
                      disabled={isSavingGuestUpload || !guestUploadConfig.uploadFolder}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSavingGuestUpload ? (
                        <>
                          <div className="loading-spinner" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <RiVideoUploadLine />
                          Save Upload Settings
                        </>
                      )}
                    </motion.button>
                  </div>
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
        {showTeamManagement && (
          <motion.div
            className="team-management-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            style={{ zIndex: 1100 }}
            onClick={() => setShowTeamManagement(false)}
          >
            <motion.div
              className="team-management-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <TeamManagement
                brand={brand}
                onClose={() => setShowTeamManagement(false)}
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
        {showCodeCreator && (
          <motion.div
            className="code-creator-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            style={{ zIndex: 1100 }}
            onClick={() => setShowCodeCreator(false)}
          >
            <motion.div
              className="code-creator-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CodeCreator brand={brand} onClose={() => setShowCodeCreator(false)} />
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
