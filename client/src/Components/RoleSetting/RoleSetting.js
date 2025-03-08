import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiRepeatFill,
  RiEditLine,
  RiLockLine,
  RiTeamLine,
  RiCodeLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import "./RoleSetting.scss";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import { toast } from "react-toastify";

const RoleSetting = ({ brand, onClose }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [codeSettings, setCodeSettings] = useState([]);
  const [loadingCodeSettings, setLoadingCodeSettings] = useState(true);

  const [newRole, setNewRole] = useState({
    name: "",
    permissions: {
      events: {
        create: false,
        edit: false,
        delete: false,
        view: true,
      },
      team: {
        manage: false,
        view: true,
      },
      analytics: {
        view: false,
      },
      codes: {
        // Will be populated with all code types
      },
      scanner: {
        use: false,
      },
    },
  });

  useEffect(() => {
    fetchRoles();
    fetchCodeSettings();
  }, [brand._id]);

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get(
        `/roles/brands/${brand._id}/roles`
      );
      setRoles(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setLoading(false);
    }
  };

  // We're only interested in custom code types now
  const fetchCodeSettings = async () => {
    try {
      setLoadingCodeSettings(true);

      // Get events for this brand
      const eventsResponse = await axiosInstance.get(
        `/events/brand/${brand._id}`
      );

      // Initialize with empty array since we're only focusing on custom codes
      let customCodeSettings = [];

      if (eventsResponse.data && eventsResponse.data.length) {
        // Use the first event to get code settings
        const eventId = eventsResponse.data[0]._id;

        const codeResponse = await axiosInstance.get(
          `/code-settings/events/${eventId}`
        );

        if (codeResponse.data && codeResponse.data.codeSettings) {
          // Get only custom code types
          customCodeSettings = codeResponse.data.codeSettings
            .filter((code) => code.type === "custom")
            .map((code) => ({
              name: code.name,
              displayName:
                code.name.charAt(0).toUpperCase() + code.name.slice(1),
              hasLimits: true, // Custom codes typically have limits
              isCustom: true,
              color: code.color || "#ffc807", // Use the code's color or default to yellow
              maxLimit: code.limit || 999, // Use code's limit or default to a high value
            }));
        }
      }

      console.log("Available custom code settings:", customCodeSettings);
      setCodeSettings(customCodeSettings);

      // Initialize role with permissions for only custom code types
      initializeRoleWithCodePermissions(customCodeSettings);
    } catch (error) {
      console.error("Error fetching code settings:", error);
    } finally {
      setLoadingCodeSettings(false);
    }
  };

  // Initialize role with permissions for custom code types only
  const initializeRoleWithCodePermissions = (codeTypes) => {
    const codePermissions = {};

    codeTypes.forEach((code) => {
      codePermissions[code.name] = {
        generate: false,
        ...(code.hasLimits ? { limit: 0, unlimited: false } : {}),
      };
    });

    setNewRole((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        codes: codePermissions,
      },
    }));
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return;

    try {
      const normalizedRole = {
        ...newRole,
        name: newRole.name.toUpperCase(),
      };

      const response = await axiosInstance.post(
        `/roles/brands/${brand._id}/roles`,
        normalizedRole
      );
      setRoles([...roles, response.data]);

      // Reset role with permissions for all code types
      resetRoleForm();
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error(error.response?.data?.message || "Failed to create role");
    }
  };

  const resetRoleForm = () => {
    // Initialize base role structure
    const resetRole = {
      name: "",
      permissions: {
        events: {
          create: false,
          edit: false,
          delete: false,
          view: true,
        },
        team: {
          manage: false,
          view: true,
        },
        analytics: {
          view: false,
        },
        codes: {},
        scanner: {
          use: false,
        },
      },
    };

    // Add code permissions for all code types
    codeSettings.forEach((code) => {
      resetRole.permissions.codes[code.name] = {
        generate: false,
        ...(code.hasLimits ? { limit: 0, unlimited: false } : {}),
      };
    });

    setNewRole(resetRole);
  };

  const handleDeleteClick = (role) => {
    if (role.name === "OWNER") return;
    setRoleToDelete(role);
    setShowDeleteConfirm(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      await axiosInstance.delete(
        `/roles/brands/${brand._id}/roles/${roleToDelete._id}`
      );
      setRoles(roles.filter((role) => role._id !== roleToDelete._id));
      toast.success("Role deleted successfully");
    } catch (error) {
      if (error.response?.data?.isAssigned) {
        toast.error("Cannot delete role that is assigned to team members");
      } else {
        toast.error("Failed to delete role");
        console.error("Error deleting role:", error);
      }
    } finally {
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
    }
  };

  const handlePermissionChange = (category, key, value) => {
    setNewRole((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [key]: value,
        },
      },
    }));
  };

  const handleCodePermissionChange = (codeType, changes) => {
    // Find the code setting for this code type to get its maxLimit
    const codeSetting = codeSettings.find((code) => code.name === codeType);
    const maxLimit = codeSetting?.maxLimit || 999;

    // If we're changing the limit, ensure it's within bounds
    if (changes.limit !== undefined) {
      changes.limit = Math.min(changes.limit, maxLimit);
    }

    setNewRole((prev) => {
      const updatedCodes = { ...prev.permissions.codes };

      if (!updatedCodes[codeType]) {
        updatedCodes[codeType] = {
          generate: false,
          limit: 0,
          unlimited: false,
        };
      }

      updatedCodes[codeType] = {
        ...updatedCodes[codeType],
        ...changes,
      };

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          codes: updatedCodes,
        },
      };
    });
  };

  const handleStartEdit = (role) => {
    if (role.name === "OWNER") return;
    setEditingRole(role);

    // Initialize role with basic permissions structure
    const initialEditRole = {
      name: role.name,
      permissions: {
        events: {
          create: role.permissions?.events?.create || false,
          edit: role.permissions?.events?.edit || false,
          delete: role.permissions?.events?.delete || false,
          view: role.permissions?.events?.view || true,
        },
        team: {
          manage: role.permissions?.team?.manage || false,
          view: role.permissions?.team?.view || true,
        },
        analytics: {
          view: role.permissions?.analytics?.view || false,
        },
        codes: {},
        scanner: {
          use: role.permissions?.scanner?.use || false,
        },
      },
    };

    // Initialize custom code permissions only
    const roleCodePermissions = role.permissions?.codes || {};

    // Make sure we have entries for all custom code types
    codeSettings.forEach((code) => {
      const existingPermission = roleCodePermissions[code.name] || {};
      initialEditRole.permissions.codes[code.name] = {
        generate: Boolean(existingPermission.generate),
        ...(code.hasLimits
          ? {
              limit: parseInt(existingPermission.limit) || 0,
              unlimited: Boolean(existingPermission.unlimited),
            }
          : {}),
      };
    });

    setNewRole(initialEditRole);
    setShowCreateForm(true);
  };

  const handleUpdateRole = async () => {
    if (!newRole.name.trim() || !editingRole) return;

    try {
      console.log("Updating role:", editingRole);
      console.log("New role data:", newRole);

      const normalizedRole = {
        ...newRole,
        name: newRole.name.toUpperCase(),
      };

      console.log("Normalized role data:", normalizedRole);
      console.log(
        `Sending request to: /roles/brands/${brand._id}/roles/${editingRole._id}`
      );

      const response = await axiosInstance.put(
        `/roles/brands/${brand._id}/roles/${editingRole._id}`,
        normalizedRole
      );

      console.log("Update role response:", response.data);

      setRoles(
        roles.map((role) =>
          role._id === editingRole._id ? response.data : role
        )
      );
      setShowCreateForm(false);
      setEditingRole(null);
      toast.success("Role updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update role");
      console.error("Error updating role:", error);
    }
  };

  const renderPermissionItem = (title, category, key, checked) => (
    <div className="permission-item">
      <div className="permission-header">
        <label className="switch">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) =>
              handlePermissionChange(category, key, e.target.checked)
            }
          />
          <span className="slider"></span>
        </label>
        <span className="permission-title">{title}</span>
      </div>
    </div>
  );

  const renderCodePermission = (
    displayName,
    codeType,
    hasLimits,
    codeColor
  ) => {
    const permission = newRole.permissions.codes[codeType] || {
      generate: false,
      ...(hasLimits ? { limit: 0, unlimited: false } : {}),
    };

    // Find the code setting to get its maxLimit
    const codeSetting = codeSettings.find((code) => code.name === codeType);
    const maxLimit = codeSetting?.maxLimit || 999;

    // Use the custom code color or default to the primary color
    const borderColor = codeColor ? codeColor : "#ffc807";

    return (
      <div className="permission-item" style={{ borderLeftColor: borderColor }}>
        <div className="permission-header">
          <label className="switch">
            <input
              type="checkbox"
              checked={permission.generate || false}
              onChange={(e) =>
                handleCodePermissionChange(codeType, {
                  generate: e.target.checked,
                })
              }
            />
            <span
              className="slider"
              style={{
                backgroundColor: permission.generate ? borderColor : "",
              }}
            ></span>
          </label>
          <span className="permission-title">{displayName}</span>
        </div>

        {hasLimits && permission.generate && (
          <div className="code-limit-section">
            <div className="limit-input-wrapper">
              <input
                type="number"
                min="0"
                max={maxLimit}
                value={permission.unlimited ? "∞" : permission.limit}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") return;

                  // Parse the value and ensure it doesn't exceed maxLimit
                  const numValue = parseInt(value) || 0;
                  const cappedValue = Math.min(numValue, maxLimit);

                  handleCodePermissionChange(codeType, {
                    limit: cappedValue,
                    unlimited: false,
                  });
                }}
                disabled={permission.unlimited}
                className="limit-input"
              />
            </div>
            <button
              className={`unlimited-btn ${
                permission.unlimited ? "active" : ""
              }`}
              style={{
                backgroundColor: permission.unlimited
                  ? `rgba(${parseInt(borderColor.slice(1, 3), 16)}, ${parseInt(
                      borderColor.slice(3, 5),
                      16
                    )}, ${parseInt(borderColor.slice(5, 7), 16)}, 0.15)`
                  : "",
              }}
              onClick={() =>
                handleCodePermissionChange(codeType, {
                  unlimited: !permission.unlimited,
                  limit: !permission.unlimited ? 0 : permission.limit,
                })
              }
            >
              <RiRepeatFill />
              <span>Maximum</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading || loadingCodeSettings) {
    return <div className="role-settings loading">Loading...</div>;
  }

  return (
    <div className="role-settings">
      <div className="header">
        <h2>Role Settings</h2>
        <motion.button
          className="close-btn"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <RiCloseLine />
        </motion.button>
      </div>

      <div className="roles-list">
        {roles.map((role) => (
          <div
            key={role._id}
            className={`role-item ${role.name === "OWNER" ? "owner" : ""}`}
          >
            <div className="role-name">{role.name}</div>
            <div className="role-actions">
              {role.name === "OWNER" ? (
                <motion.span
                  className="action-btn lock"
                  whileHover={{ scale: 1 }}
                >
                  <RiLockLine />
                </motion.span>
              ) : (
                <>
                  <motion.button
                    className="action-btn edit"
                    onClick={() => handleStartEdit(role)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <RiEditLine />
                  </motion.button>
                  <motion.button
                    className="action-btn delete"
                    onClick={() => handleDeleteClick(role)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <RiDeleteBin6Line />
                  </motion.button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <motion.button
        className="add-role-btn"
        onClick={() => {
          resetRoleForm();
          setShowCreateForm(true);
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <RiAddLine />
        <span>Add New Role</span>
      </motion.button>

      {showCreateForm && (
        <motion.div
          className="form-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="create-role-form"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <h3>{editingRole ? "Edit Role" : "Create New Role"}</h3>
            <input
              type="text"
              placeholder="Role Name"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
            />

            <div className="permissions-section">
              <h4>Event Permissions</h4>
              <div className="permission-group">
                {renderPermissionItem(
                  "Create Events",
                  "events",
                  "create",
                  newRole.permissions.events.create
                )}
                {renderPermissionItem(
                  "Edit Events",
                  "events",
                  "edit",
                  newRole.permissions.events.edit
                )}
                {renderPermissionItem(
                  "Delete Events",
                  "events",
                  "delete",
                  newRole.permissions.events.delete
                )}
              </div>

              <h4>Team Permissions</h4>
              <div className="permission-group">
                {renderPermissionItem(
                  "Manage Team",
                  "team",
                  "manage",
                  newRole.permissions.team.manage
                )}
              </div>

              {codeSettings.length > 0 && (
                <div className="permission-group">
                  <h4>Custom Codes</h4>
                  {codeSettings.length > 0 ? (
                    <div className="custom-codes">
                      {codeSettings.map((code) => (
                        <div key={code.name}>
                          {renderCodePermission(
                            code.displayName,
                            code.name,
                            code.hasLimits,
                            code.color
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-custom-codes">
                      <RiCodeLine />
                      <span>No custom codes available</span>
                    </div>
                  )}
                </div>
              )}

              <h4>Other Permissions</h4>
              <div className="permission-group">
                {renderPermissionItem(
                  "View Analytics",
                  "analytics",
                  "view",
                  newRole.permissions.analytics.view
                )}
                {renderPermissionItem(
                  "Scanner Access",
                  "scanner",
                  "use",
                  newRole.permissions.scanner.use
                )}
              </div>
            </div>

            <div className="form-actions">
              <motion.button
                className="cancel-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRole(null);
                  resetRoleForm();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                className="save-btn"
                onClick={editingRole ? handleUpdateRole : handleCreateRole}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {editingRole ? "Update Role" : "Create Role"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {showDeleteConfirm && roleToDelete && (
          <ConfirmDialog
            title="Delete Role"
            message={`Are you sure you want to delete the role "${roleToDelete.name}"? This action cannot be undone.`}
            confirmText="Delete"
            type="danger"
            onConfirm={handleDeleteRole}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setRoleToDelete(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoleSetting;
