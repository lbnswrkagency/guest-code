import React, { useState, useEffect } from "react";
import "./CoHostRoleSettings.scss";
import {
  RiCloseLine,
  RiSaveLine,
  RiSettingsLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiFileCopyLine,
  RiDownloadLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

const CoHostRoleSettings = ({
  isOpen,
  onClose,
  coHostBrand,
  eventId,
  eventCodeSettings = [], // Keep for backward compatibility but we'll fetch from API
  onPermissionsUpdate,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState({}); // Track which roles are expanded
  const [mainHostCustomCodes, setMainHostCustomCodes] = useState([]); // Store custom codes from main host
  const [inheritingFromCoHost, setInheritingFromCoHost] = useState(false); // Track inheritance loading
  const [inheritingAllFromCoHost, setInheritingAllFromCoHost] = useState(false); // Track global inheritance loading

  // Fetch co-host brand's roles when modal opens
  useEffect(() => {
    if (isOpen && coHostBrand && eventId) {
      fetchCoHostRoles();
    }
  }, [isOpen, coHostBrand, eventId]);

  const fetchCoHostRoles = async () => {
    setLoading(true);

    try {
      // Validate required parameters
      if (!coHostBrand?._id) {
        throw new Error("Co-host brand ID is required");
      }
      if (!eventId) {
        throw new Error("Event ID is required");
      }

      // Fetch both co-host roles and main host's custom codes in parallel
      const [rolesResponse, customCodesResponse] = await Promise.all([
        axiosInstance.get(`/co-hosts/roles/${coHostBrand._id}`),
        axiosInstance.get(`/co-hosts/custom-codes/${eventId}`),
      ]);

      setRoles(rolesResponse.data);
      setMainHostCustomCodes(customCodesResponse.data);

      // Initialize permissions structure for each role
      const initialPermissions = {};
      rolesResponse.data.forEach((role) => {
        initialPermissions[role._id] = {
          analytics: { view: false },
          codes: {},
          scanner: { use: false },
          tables: { access: false, manage: false, summary: false },
          battles: { view: false, edit: false, delete: false },
        };

        // Initialize code permissions based on main host's custom codes (from API)
        if (customCodesResponse.data && customCodesResponse.data.length > 0) {
          customCodesResponse.data.forEach((codeSetting) => {
            // Use the code setting name as the key
            const codeKey = codeSetting.name;
            initialPermissions[role._id].codes[codeKey] = {
              generate: false,
              limit: 0,
              unlimited: false,
            };
          });
        }
      });

      setPermissions(initialPermissions);

      // Expand the first role by default
      if (rolesResponse.data.length > 0) {
        setExpandedRoles({ [rolesResponse.data[0]._id]: true });
      }

      // Load existing permissions if they exist
      if (eventId) {
        await loadExistingPermissions();
      }
    } catch (error) {
      toast.showError("Failed to load co-host roles");
    } finally {
      setLoading(false);
    }
  };

  const loadExistingPermissions = async () => {
    try {
      const response = await axiosInstance.get(
        `/co-hosts/permissions/${eventId}/${coHostBrand._id}`
      );
      if (response.data) {
        setPermissions((prev) => ({
          ...prev,
          ...response.data,
        }));
      }
    } catch (error) {
      // Ignore 404 errors - no existing permissions is fine
      if (error.response?.status !== 404) {
        toast.showError("Error loading existing permissions");
      }
    }
  };

  const handlePermissionChange = (roleId, category, permission, value) => {
    setPermissions((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [category]: {
          ...prev[roleId]?.[category],
          [permission]: value,
        },
      },
    }));
  };

  const handleCodePermissionChange = (roleId, codeName, permission, value) => {
    setPermissions((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        codes: {
          ...prev[roleId]?.codes,
          [codeName]: {
            ...prev[roleId]?.codes?.[codeName],
            [permission]: value,
          },
        },
      },
    }));
  };

  const toggleRoleExpanded = (roleId) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [roleId]: !prev[roleId],
    }));
  };

  const handleInheritFromAbove = (currentRoleIndex) => {
    if (currentRoleIndex === 0) return; // Can't inherit if it's the first role

    const currentRoleId = roles[currentRoleIndex]._id;
    const previousRoleId = roles[currentRoleIndex - 1]._id;
    const previousPermissions = permissions[previousRoleId];

    if (!previousPermissions) return;

    // Deep copy the previous role's permissions
    const inheritedPermissions = JSON.parse(JSON.stringify(previousPermissions));

    setPermissions((prev) => ({
      ...prev,
      [currentRoleId]: inheritedPermissions,
    }));

    toast.showSuccess(`Inherited permissions from ${roles[currentRoleIndex - 1].name}`);
  };

  const handleInheritFromCoHost = async (targetRoleIndex) => {
    setInheritingFromCoHost(true);
    
    try {
      // Fetch the co-host brand's default permissions
      const response = await axiosInstance.get(
        `/co-hosts/default-permissions/${coHostBrand._id}`
      );
      
      const coHostDefaultPermissions = response.data;
      const targetRole = roles[targetRoleIndex];
      
      if (!targetRole) {
        toast.showError("Target role not found");
        return;
      }

      // Find matching role from co-host by name or founder status
      let matchingCoHostRole = null;
      
      // First try to match by exact name
      matchingCoHostRole = coHostDefaultPermissions.find(
        chRole => chRole.roleName.toLowerCase() === targetRole.name.toLowerCase()
      );
      
      // If no exact match and target is founder, find co-host founder
      if (!matchingCoHostRole && targetRole.isFounder) {
        matchingCoHostRole = coHostDefaultPermissions.find(
          chRole => chRole.isFounder
        );
      }
      
      // If still no match, try to find default role
      if (!matchingCoHostRole) {
        matchingCoHostRole = coHostDefaultPermissions.find(
          chRole => chRole.isDefault
        );
      }
      
      // If still no match, use the first role
      if (!matchingCoHostRole && coHostDefaultPermissions.length > 0) {
        matchingCoHostRole = coHostDefaultPermissions[0];
      }

      if (!matchingCoHostRole) {
        toast.showError("No matching role found in co-host brand");
        return;
      }

      // Create new permissions object with intelligent code inheritance
      const currentPermissions = permissions[targetRole._id] || {};
      const existingCodes = currentPermissions.codes || {};
      const coHostCodes = matchingCoHostRole.permissions.codes || {};
      
      // Merge codes: inherit matching names, preserve unmatched existing codes
      const mergedCodes = { ...existingCodes };
      
      // Check each co-host code to see if we have a matching main host code
      Object.keys(coHostCodes).forEach(coHostCodeName => {
        // Check if main host has a custom code with the same name
        const hasMatchingMainHostCode = mainHostCustomCodes.some(
          mainCode => mainCode.name === coHostCodeName
        );
        
        if (hasMatchingMainHostCode) {
          // Inherit the co-host's permissions for this matching code
          mergedCodes[coHostCodeName] = coHostCodes[coHostCodeName];
        }
        // If no match, don't add this co-host code (it doesn't exist in main host)
      });
      
      const inheritedPermissions = {
        ...matchingCoHostRole.permissions,
        codes: mergedCodes // Use merged codes with intelligent inheritance
      };

      setPermissions((prev) => ({
        ...prev,
        [targetRole._id]: inheritedPermissions,
      }));

      // Count how many custom codes were inherited
      const inheritedCodeCount = Object.keys(coHostCodes).filter(coHostCodeName =>
        mainHostCustomCodes.some(mainCode => mainCode.name === coHostCodeName)
      ).length;

      let successMessage = `Inherited permissions from co-host role "${matchingCoHostRole.roleName}"`;
      if (inheritedCodeCount > 0) {
        successMessage += ` (including ${inheritedCodeCount} matching custom code${inheritedCodeCount > 1 ? 's' : ''})`;
      }

      toast.showSuccess(successMessage);
      
    } catch (error) {
      console.error("Error inheriting from co-host:", error);
      toast.showError("Failed to inherit permissions from co-host");
    } finally {
      setInheritingFromCoHost(false);
    }
  };

  const handleInheritAllFromCoHost = async () => {
    setInheritingAllFromCoHost(true);
    
    try {
      // Fetch the co-host brand's default permissions
      const response = await axiosInstance.get(
        `/co-hosts/default-permissions/${coHostBrand._id}`
      );
      
      const coHostDefaultPermissions = response.data;
      
      if (!coHostDefaultPermissions || coHostDefaultPermissions.length === 0) {
        toast.showError("No roles found in co-host brand");
        return;
      }

      const updatedPermissions = { ...permissions };
      let totalInheritedRoles = 0;
      let totalInheritedCodes = 0;

      // Process each role
      roles.forEach((targetRole) => {
        // Find matching role from co-host by name or founder status
        let matchingCoHostRole = null;
        
        // First try to match by exact name
        matchingCoHostRole = coHostDefaultPermissions.find(
          chRole => chRole.roleName.toLowerCase() === targetRole.name.toLowerCase()
        );
        
        // If no exact match and target is founder, find co-host founder
        if (!matchingCoHostRole && targetRole.isFounder) {
          matchingCoHostRole = coHostDefaultPermissions.find(
            chRole => chRole.isFounder
          );
        }
        
        // If still no match, try to find default role
        if (!matchingCoHostRole) {
          matchingCoHostRole = coHostDefaultPermissions.find(
            chRole => chRole.isDefault
          );
        }
        
        // If still no match, use the first role
        if (!matchingCoHostRole && coHostDefaultPermissions.length > 0) {
          matchingCoHostRole = coHostDefaultPermissions[0];
        }

        if (matchingCoHostRole) {
          // Create new permissions object with intelligent code inheritance
          const currentPermissions = permissions[targetRole._id] || {};
          const existingCodes = currentPermissions.codes || {};
          const coHostCodes = matchingCoHostRole.permissions.codes || {};
          
          // Merge codes: inherit matching names, preserve unmatched existing codes
          const mergedCodes = { ...existingCodes };
          
          // Check each co-host code to see if we have a matching main host code
          Object.keys(coHostCodes).forEach(coHostCodeName => {
            // Check if main host has a custom code with the same name
            const hasMatchingMainHostCode = mainHostCustomCodes.some(
              mainCode => mainCode.name === coHostCodeName
            );
            
            if (hasMatchingMainHostCode) {
              // Inherit the co-host's permissions for this matching code
              mergedCodes[coHostCodeName] = coHostCodes[coHostCodeName];
              totalInheritedCodes++;
            }
          });
          
          const inheritedPermissions = {
            ...matchingCoHostRole.permissions,
            codes: mergedCodes // Use merged codes with intelligent inheritance
          };

          updatedPermissions[targetRole._id] = inheritedPermissions;
          totalInheritedRoles++;
        }
      });

      // Update all permissions at once
      setPermissions(updatedPermissions);

      // Show comprehensive success message
      let successMessage = `Inherited permissions for ${totalInheritedRoles} role${totalInheritedRoles > 1 ? 's' : ''} from ${coHostBrand.name}`;
      if (totalInheritedCodes > 0) {
        successMessage += ` (including ${totalInheritedCodes} matching custom code permission${totalInheritedCodes > 1 ? 's' : ''})`;
      }

      toast.showSuccess(successMessage);
      
    } catch (error) {
      console.error("Error inheriting all from co-host:", error);
      toast.showError("Failed to inherit all permissions from co-host");
    } finally {
      setInheritingAllFromCoHost(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.post(`/co-hosts/permissions/${eventId}`, {
        brandId: coHostBrand._id,
        permissions,
      });

      toast.showSuccess("Co-host permissions saved successfully");
      onPermissionsUpdate?.(coHostBrand._id, permissions);
      onClose();
    } catch (error) {
      toast.showError("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !coHostBrand) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="co-host-role-settings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="co-host-role-settings-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="header-content">
              <RiSettingsLine className="header-icon" />
              <div className="header-text">
                <h2>Configure Permissions</h2>
                <p>Set permissions for {coHostBrand.name} team members</p>
              </div>
            </div>
            <button className="close-button" onClick={onClose}>
              <RiCloseLine />
            </button>
          </div>

          <div className="modal-body">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading roles...</p>
              </div>
            ) : (
              <>
                {/* Global Inherit All Button */}
                <div className="global-inherit-container">
                  <button
                    type="button"
                    className="global-inherit-button"
                    onClick={handleInheritAllFromCoHost}
                    disabled={inheritingAllFromCoHost || loading}
                    title={`Copy all permissions from ${coHostBrand.name} to all roles (with matching custom codes)`}
                  >
                    <RiDownloadLine />
                    <span>
                      {inheritingAllFromCoHost ? "Inheriting All..." : `Inherit All from ${coHostBrand.name}`}
                    </span>
                  </button>
                </div>

                <div className="roles-container">
                {roles.map((role, roleIndex) => (
                  <div key={role._id} className="role-section">
                    <div
                      className={`role-header clickable ${
                        role.isFounder ? "founder-role" : ""
                      }`}
                      onClick={() => toggleRoleExpanded(role._id)}
                    >
                      <div className="role-header-content">
                        <h3>
                          {role.name}
                          {role.isFounder && (
                            <span className="founder-badge">FOUNDER</span>
                          )}
                        </h3>
                        {role.description && <p>{role.description}</p>}
                      </div>
                      <div className="role-toggle">
                        {expandedRoles[role._id] ? (
                          <RiArrowDownSLine />
                        ) : (
                          <RiArrowRightSLine />
                        )}
                      </div>
                    </div>

                    {/* Inherit buttons - only show if role is expanded */}
                    {expandedRoles[role._id] && (
                      <div className="inherit-permissions-container">
                        {/* Inherit from above button - only show if not the first role */}
                        {roleIndex > 0 && (
                          <button
                            type="button"
                            className="inherit-permissions-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInheritFromAbove(roleIndex);
                            }}
                            title={`Copy all permissions from ${roles[roleIndex - 1].name}`}
                          >
                            <RiFileCopyLine />
                            <span>Inherit from {roles[roleIndex - 1].name}</span>
                          </button>
                        )}
                        
                        {/* Inherit from CoHost button */}
                        <button
                          type="button"
                          className="inherit-permissions-button cohost-inherit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInheritFromCoHost(roleIndex);
                          }}
                          disabled={inheritingFromCoHost}
                          title={`Copy permissions from ${coHostBrand.name} (excluding custom codes)`}
                        >
                          <RiDownloadLine />
                          <span>
                            {inheritingFromCoHost ? "Loading..." : `Inherit from ${coHostBrand.name}`}
                          </span>
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {expandedRoles[role._id] && (
                        <motion.div
                          className="permissions-grid"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Analytics */}
                          <div className="permission-category">
                            <h4>Analytics</h4>
                            <div className="permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={
                                    permissions[role._id]?.analytics?.view ||
                                    false
                                  }
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      role._id,
                                      "analytics",
                                      "view",
                                      e.target.checked
                                    )
                                  }
                                />
                                View Analytics
                              </label>
                            </div>
                          </div>

                          {/* Scanner */}
                          <div className="permission-category">
                            <h4>Scanner</h4>
                            <div className="permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={
                                    permissions[role._id]?.scanner?.use || false
                                  }
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      role._id,
                                      "scanner",
                                      "use",
                                      e.target.checked
                                    )
                                  }
                                />
                                Use Scanner
                              </label>
                            </div>
                          </div>

                          {/* Tables */}
                          <div className="permission-category">
                            <h4>Tables</h4>
                            <div className="permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={
                                    permissions[role._id]?.tables?.access ||
                                    false
                                  }
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      role._id,
                                      "tables",
                                      "access",
                                      e.target.checked
                                    )
                                  }
                                />
                                Access Tables
                              </label>
                            </div>
                            <div className="permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={
                                    permissions[role._id]?.tables?.manage ||
                                    false
                                  }
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      role._id,
                                      "tables",
                                      "manage",
                                      e.target.checked
                                    )
                                  }
                                />
                                Manage Tables
                              </label>
                            </div>
                            <div className="permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={
                                    permissions[role._id]?.tables?.summary ||
                                    false
                                  }
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      role._id,
                                      "tables",
                                      "summary",
                                      e.target.checked
                                    )
                                  }
                                />
                                View Table Summary
                              </label>
                            </div>
                          </div>

                          {/* Battles */}
                          <div className="permission-category">
                            <h4>Battles</h4>
                            <div className="permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={
                                    permissions[role._id]?.battles?.view ||
                                    false
                                  }
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      role._id,
                                      "battles",
                                      "view",
                                      e.target.checked
                                    )
                                  }
                                />
                                View Battles
                              </label>
                            </div>
                            <div className="permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={
                                    permissions[role._id]?.battles?.edit ||
                                    false
                                  }
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      role._id,
                                      "battles",
                                      "edit",
                                      e.target.checked
                                    )
                                  }
                                />
                                Edit Battles
                              </label>
                            </div>
                            <div className="permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={
                                    permissions[role._id]?.battles?.delete ||
                                    false
                                  }
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      role._id,
                                      "battles",
                                      "delete",
                                      e.target.checked
                                    )
                                  }
                                />
                                Delete Battles
                              </label>
                            </div>
                          </div>

                          {/* Custom Codes from Main Host */}
                          <div className="permission-category codes-category">
                            <h4>Custom Codes (Main Host)</h4>
                            <p className="codes-subtitle">
                              Configure permissions for the main host's custom
                              codes
                            </p>
                            {mainHostCustomCodes &&
                            mainHostCustomCodes.length > 0 ? (
                              mainHostCustomCodes.map((codeSetting) => {
                                const codeKey = codeSetting.name;
                                return (
                                  <div
                                    key={codeSetting._id || codeKey}
                                    className="code-permission"
                                  >
                                    <h5
                                      style={{
                                        color: codeSetting.color || "#ffc807",
                                      }}
                                    >
                                      {codeSetting.name}
                                    </h5>
                                    <div className="code-controls">
                                      <div className="permission-item">
                                        <label>
                                          <input
                                            type="checkbox"
                                            checked={
                                              permissions[role._id]?.codes?.[
                                                codeKey
                                              ]?.generate || false
                                            }
                                            onChange={(e) =>
                                              handleCodePermissionChange(
                                                role._id,
                                                codeKey,
                                                "generate",
                                                e.target.checked
                                              )
                                            }
                                          />
                                          Generate Codes
                                        </label>
                                      </div>
                                      <div className="permission-item">
                                        <label>
                                          <input
                                            type="checkbox"
                                            checked={
                                              permissions[role._id]?.codes?.[
                                                codeKey
                                              ]?.unlimited || false
                                            }
                                            onChange={(e) =>
                                              handleCodePermissionChange(
                                                role._id,
                                                codeKey,
                                                "unlimited",
                                                e.target.checked
                                              )
                                            }
                                          />
                                          Unlimited
                                        </label>
                                      </div>
                                      {!permissions[role._id]?.codes?.[codeKey]
                                        ?.unlimited && (
                                        <div className="permission-item">
                                          <label>
                                            Limit:
                                            <input
                                              type="number"
                                              min="0"
                                              max={codeSetting.limit || 999}
                                              value={
                                                permissions[role._id]?.codes?.[
                                                  codeKey
                                                ]?.limit || 0
                                              }
                                              onChange={(e) =>
                                                handleCodePermissionChange(
                                                  role._id,
                                                  codeKey,
                                                  "limit",
                                                  parseInt(e.target.value) || 0
                                                )
                                              }
                                              className="limit-input"
                                            />
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="no-custom-codes">
                                <p>No custom codes found for this event.</p>
                                <p className="hint">
                                  Custom codes must be created by the main host
                                  first.
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={saving || loading}
            >
              <RiSaveLine />
              {saving ? "Saving..." : "Save Permissions"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CoHostRoleSettings;
