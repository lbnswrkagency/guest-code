import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEditLine,
  RiLockLine,
  RiTeamLine,
  RiCodeLine,
  RiShieldCheckLine,
  RiEyeLine,
  RiSettings3Line,
  RiTableLine,
  RiSwordLine,
  RiQrScanLine,
  RiBarChartBoxLine,
  RiSaveLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiRepeatLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import "./RoleSetting.scss";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import { useToast } from "../Toast/ToastContext";
import AuthContext from "../../contexts/AuthContext";

// Memoized LoadingSpinner component
const LoadingSpinner = React.memo(({ size = "default", color = "#d4af37" }) => {
  const spinnerSize = size === "small" ? "16px" : "24px";
  return (
    <div
      className="role-spinner"
      style={{
        width: spinnerSize,
        height: spinnerSize,
        borderColor: `${color}40`,
        borderTopColor: color,
      }}
    />
  );
});

/**
 * RoleSetting component for managing brand roles and permissions
 * @param {Object} props
 * @param {Object} props.brand - Brand object with team and permissions
 * @param {Function} props.onClose - Callback to close the role settings
 */
const RoleSetting = ({ brand, onClose }) => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [codeSettings, setCodeSettings] = useState([]);
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Check if the current user is the brand owner
  const isBrandOwner = useCallback(() => {
    if (!user || !brand) return false;
    const ownerId = typeof brand.owner === "object" ? brand.owner._id : brand.owner;
    return ownerId === user._id;
  }, [user, brand]);

  // Memoize permission categories for better organization
  const permissionCategories = useMemo(() => [
    {
      id: 'events',
      title: 'Event Management',
      icon: RiSettings3Line,
      color: primaryColor,
      permissions: [
        { key: 'create', label: 'Create Events', description: 'Can create new events' },
        { key: 'edit', label: 'Edit Events', description: 'Can modify existing events' },
        { key: 'delete', label: 'Delete Events', description: 'Can delete events' },
        { key: 'view', label: 'View Events', description: 'Can view event details' },
      ]
    },
    {
      id: 'team',
      title: 'Team Management',
      icon: RiTeamLine,
      color: '#4ade80',
      permissions: [
        { key: 'manage', label: 'Manage Team', description: 'Can add/remove team members' },
        { key: 'view', label: 'View Team', description: 'Can see team member list' },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: RiBarChartBoxLine,
      color: '#3b82f6',
      permissions: [
        { key: 'view', label: 'View Analytics', description: 'Can access analytics dashboard' },
      ]
    },
    {
      id: 'scanner',
      title: 'Scanner Access',
      icon: RiQrScanLine,
      color: '#8b5cf6',
      permissions: [
        { key: 'use', label: 'Use Scanner', description: 'Can scan QR codes at events' },
      ]
    },
    {
      id: 'tables',
      title: 'Table Management',
      icon: RiTableLine,
      color: '#f59e0b',
      permissions: [
        { key: 'access', label: 'Table Access', description: 'Can access table system' },
        { key: 'manage', label: 'Manage Tables', description: 'Can manage table bookings' },
        { key: 'summary', label: 'Table Reports', description: 'Can view table summaries' },
      ]
    },
    {
      id: 'battles',
      title: 'Battle System',
      icon: RiSwordLine,
      color: '#ef4444',
      permissions: [
        { key: 'view', label: 'View Battles', description: 'Can view battle events' },
        { key: 'edit', label: 'Edit Battles', description: 'Can modify battle settings' },
        { key: 'delete', label: 'Delete Battles', description: 'Can remove battles' },
      ]
    }
  ], [primaryColor]);

  // Initial role template
  const createInitialRole = useCallback(() => ({
    name: "",
    permissions: {
      events: { create: false, edit: false, delete: false, view: true },
      team: { manage: false, view: true },
      analytics: { view: false },
      codes: {},
      scanner: { use: false },
      tables: { access: false, manage: false, summary: false },
      battles: { view: false, edit: false, delete: false },
    },
  }), []);

  const [newRole, setNewRole] = useState(createInitialRole);

  // Fetch roles data
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/roles/brands/${brand._id}/roles`);
      setRoles(response.data);
    } catch (error) {
      toast.showError("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [brand._id, toast]);

  // Fetch code settings for custom codes from parent events only
  const fetchCodeSettings = useCallback(async () => {
    try {
      const eventsResponse = await axiosInstance.get(`/events/brand/${brand._id}`);

      if (eventsResponse.data?.length > 0) {
        // Filter to only parent events (no parentEventId) to avoid duplicate codes from child events
        const parentEvents = eventsResponse.data.filter(event => !event.parentEventId);
        const allCustomCodes = [];

        // Fetch code settings from parent events using Promise.all for performance
        const codePromises = parentEvents.map(event =>
          axiosInstance.get(`/code-settings/events/${event._id}`)
            .then(response => ({ event, codeSettings: response.data?.codeSettings || [] }))
            .catch(() => ({ event, codeSettings: [] }))
        );

        const results = await Promise.all(codePromises);

        for (const { event, codeSettings } of results) {
          if (codeSettings.length > 0) {
            const customCodes = codeSettings
              .filter(code => code.type === "custom")
              .map(code => ({
                id: code._id,
                eventId: event._id,
                eventTitle: event.title,
                name: code.name,
                // Permission key includes eventId for event-specific permissions
                permissionKey: `${event._id}_${code.name}`,
                displayName: `${code.name} (${event.title})`,
                color: code.color || primaryColor,
                hasLimits: true,
                maxLimit: code.limit || 999,
              }));

            allCustomCodes.push(...customCodes);
          }
        }

        // NO deduplication - show ALL codes from ALL events with event-specific permissions
        setCodeSettings(allCustomCodes);
        initializeRoleWithCodePermissions(allCustomCodes);
      }
    } catch (error) {
      // Silent fail for code settings
    }
  }, [brand._id, primaryColor]);

  // Initialize role with code permissions
  const initializeRoleWithCodePermissions = useCallback((codeTypes) => {
    const codePermissions = {};
    codeTypes.forEach(code => {
      // Use permissionKey (eventId_codeName) for event-specific permissions
      codePermissions[code.permissionKey] = {
        generate: false,
        limit: 0,
        unlimited: false,
      };
    });

    setNewRole(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        codes: codePermissions,
      },
    }));
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchRoles();
    fetchCodeSettings();
  }, [fetchRoles, fetchCodeSettings]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!newRole.name.trim()) {
      errors.name = "Role name is required";
    } else if (newRole.name.toUpperCase() === "FOUNDER" && !editingRole?.isFounder) {
      errors.name = "Cannot create another Founder role";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newRole.name, editingRole]);

  // Handle role creation
  const handleCreateRole = useCallback(async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      const response = await axiosInstance.post(
        `/roles/brands/${brand._id}/roles`,
        { ...newRole, name: newRole.name.toUpperCase() }
      );
      
      setRoles(prev => [...prev, response.data]);
      setNewRole(createInitialRole());
      setExpandedRole(null);
      toast.showSuccess("Role created successfully");
    } catch (error) {
      toast.showError(error.response?.data?.message || "Failed to create role");
    } finally {
      setSaving(false);
    }
  }, [validateForm, newRole, brand._id, createInitialRole, toast]);

  // Handle role update
  const handleUpdateRole = useCallback(async () => {
    if (!validateForm() || !editingRole) return;
    
    try {
      setSaving(true);
      const response = await axiosInstance.put(
        `/roles/brands/${brand._id}/roles/${editingRole._id}`,
        { ...newRole, name: newRole.name.toUpperCase() }
      );
      
      setRoles(prev => prev.map(role => 
        role._id === editingRole._id ? response.data : role
      ));
      
      setEditingRole(null);
      setExpandedRole(null);
      setNewRole(createInitialRole());
      toast.showSuccess("Role updated successfully");
    } catch (error) {
      toast.showError(error.response?.data?.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  }, [validateForm, editingRole, newRole, brand._id, createInitialRole, toast]);

  // Handle role deletion
  const handleDeleteRole = useCallback(async () => {
    if (!roleToDelete) return;

    try {
      await axiosInstance.delete(`/roles/brands/${brand._id}/roles/${roleToDelete._id}`);
      setRoles(prev => prev.filter(role => role._id !== roleToDelete._id));
      toast.showSuccess("Role deleted successfully");
    } catch (error) {
      if (error.response?.data?.isAssigned) {
        toast.showError("Cannot delete role that is assigned to team members");
      } else {
        toast.showError("Failed to delete role");
      }
    } finally {
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
    }
  }, [roleToDelete, brand._id, toast]);

  // Handle starting role edit
  const handleStartEdit = useCallback((role) => {
    setEditingRole(role);
    
    // Initialize edit form with existing role data
    const editFormData = {
      name: role.name,
      permissions: {
        events: { ...role.permissions?.events },
        team: { ...role.permissions?.team },
        analytics: { ...role.permissions?.analytics },
        scanner: { ...role.permissions?.scanner },
        tables: { ...role.permissions?.tables },
        battles: { ...role.permissions?.battles },
        codes: { ...role.permissions?.codes } || {},
      },
    };
    
    // Initialize custom code permissions using permissionKey (eventId_codeName)
    codeSettings.forEach(code => {
      const existing = role.permissions?.codes?.[code.permissionKey] || {};
      editFormData.permissions.codes[code.permissionKey] = {
        generate: Boolean(existing.generate),
        limit: parseInt(existing.limit) || 0,
        unlimited: Boolean(existing.unlimited),
      };
    });
    
    setNewRole(editFormData);
    setExpandedRole(role._id);
  }, [codeSettings]);

  // Handle permission changes
  const handlePermissionChange = useCallback((category, key, value) => {
    setNewRole(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [key]: value,
        },
      },
    }));
  }, []);

  // Handle code permission changes (uses permissionKey for event-specific permissions)
  const handleCodePermissionChange = useCallback((permissionKey, changes) => {
    const codeSetting = codeSettings.find(code => code.permissionKey === permissionKey);
    const maxLimit = codeSetting?.maxLimit || 999;

    if (changes.limit !== undefined) {
      changes.limit = Math.min(changes.limit, maxLimit);
    }

    setNewRole(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        codes: {
          ...prev.permissions.codes,
          [permissionKey]: {
            ...prev.permissions.codes[permissionKey],
            ...changes,
          },
        },
      },
    }));
  }, [codeSettings]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditingRole(null);
    setExpandedRole(null);
    setNewRole(createInitialRole());
    setFormErrors({});
  }, [createInitialRole]);

  if (loading) {
    return (
      <div className="role-settings">
        <div className="loading-container">
          <LoadingSpinner color={primaryColor} />
          <p>Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-settings">
      <div className="role-settings-header">
        <div className="header-content">
          <RiShieldCheckLine className="header-icon" style={{ color: primaryColor }} />
          <div className="header-text">
            <h2>Role Management</h2>
            <p>Manage team roles and permissions for {brand.name}</p>
          </div>
        </div>
        <motion.button
          className="close-btn"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <RiCloseLine />
        </motion.button>
      </div>

      <div className="roles-container">
        {/* Existing Roles */}
        <div className="roles-list">
          {roles.map((role) => (
            <motion.div
              key={role._id}
              className={`role-card ${role.isFounder ? "founder" : ""} ${
                expandedRole === role._id ? "expanded" : ""
              }`}
              initial={false}
              animate={{
                backgroundColor: expandedRole === role._id ? 
                  `${primaryColor}10` : "rgba(255, 255, 255, 0.05)",
              }}
            >
              <div className="role-card-header">
                <div className="role-info">
                  <div className="role-name">
                    {role.isFounder && <RiShieldCheckLine className="founder-icon" />}
                    {role.name}
                  </div>
                  <div className="role-meta">
                    {role.isDefault && <span className="default-badge">Default</span>}
                    {role.isFounder && <span className="founder-badge">Founder</span>}
                  </div>
                </div>
                
                <div className="role-actions">
                  {/* Edit button logic */}
                  {(role.isFounder || !role.isDefault || user?.isDeveloper) && (
                    <motion.button
                      className="action-btn edit"
                      onClick={() => handleStartEdit(role)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      disabled={expandedRole === role._id}
                    >
                      <RiEditLine />
                    </motion.button>
                  )}
                  
                  {role.isDefault && !user?.isDeveloper && (
                    <motion.button
                      className="action-btn locked"
                      title="Only developers can edit default roles"
                      whileHover={{ scale: 1.05 }}
                    >
                      <RiLockLine />
                    </motion.button>
                  )}
                  
                  {/* Delete button - only for non-default, non-founder roles */}
                  {!role.isDefault && !role.isFounder && (
                    <motion.button
                      className="action-btn delete"
                      onClick={() => {
                        setRoleToDelete(role);
                        setShowDeleteConfirm(true);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <RiDeleteBin6Line />
                    </motion.button>
                  )}
                  
                  {/* Expand/collapse button */}
                  <motion.button
                    className="action-btn expand"
                    onClick={() => setExpandedRole(
                      expandedRole === role._id ? null : role._id
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {expandedRole === role._id ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
                  </motion.button>
                </div>
              </div>

              {/* Role permissions preview */}
              <AnimatePresence>
                {expandedRole === role._id && (
                  <motion.div
                    className="role-permissions"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {editingRole?._id === role._id ? (
                      // Edit form
                      <div className="role-edit-form">
                        <div className="form-section">
                          <label className="form-label">Role Name</label>
                          <input
                            type="text"
                            value={newRole.name}
                            onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                            className={formErrors.name ? "error" : ""}
                            placeholder="Enter role name"
                          />
                          {formErrors.name && (
                            <div className="error-message">{formErrors.name}</div>
                          )}
                        </div>

                        {/* Permission Categories */}
                        {permissionCategories.map((category) => (
                          <div key={category.id} className="permission-category">
                            <div className="category-header">
                              <category.icon style={{ color: category.color }} />
                              <span>{category.title}</span>
                            </div>
                            <div className="permissions-grid">
                              {category.permissions.map((perm) => (
                                <label key={perm.key} className="permission-item">
                                  <input
                                    type="checkbox"
                                    checked={newRole.permissions[category.id]?.[perm.key] || false}
                                    onChange={(e) => handlePermissionChange(
                                      category.id, perm.key, e.target.checked
                                    )}
                                  />
                                  <div className="permission-content">
                                    <span className="permission-label">{perm.label}</span>
                                    <span className="permission-description">{perm.description}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Custom Codes Section */}
                        {codeSettings.length > 0 && (
                          <div className="permission-category">
                            <div className="category-header">
                              <RiCodeLine style={{ color: primaryColor }} />
                              <span>Custom Codes</span>
                            </div>
                            <div className="codes-grid">
                              {codeSettings.map((code) => {
                                const permission = newRole.permissions.codes?.[code.permissionKey] || {};
                                return (
                                  <div key={code.permissionKey} className="code-permission-item">
                                    <label className="code-toggle">
                                      <input
                                        type="checkbox"
                                        checked={permission.generate || false}
                                        onChange={(e) => handleCodePermissionChange(code.permissionKey, {
                                          generate: e.target.checked,
                                        })}
                                      />
                                      <span className="code-name" style={{ color: code.color }}>
                                        {code.displayName}
                                      </span>
                                    </label>

                                    {permission.generate && code.hasLimits && (
                                      <div className="code-limits">
                                        <input
                                          type="number"
                                          min="0"
                                          max={code.maxLimit}
                                          value={permission.unlimited ? "" : permission.limit}
                                          onChange={(e) => handleCodePermissionChange(code.permissionKey, {
                                            limit: parseInt(e.target.value) || 0,
                                            unlimited: false,
                                          })}
                                          disabled={permission.unlimited}
                                          placeholder="0"
                                          className="limit-input"
                                        />
                                        <button
                                          type="button"
                                          className={`unlimited-btn ${permission.unlimited ? 'active' : ''}`}
                                          onClick={() => handleCodePermissionChange(code.permissionKey, {
                                            unlimited: !permission.unlimited,
                                          })}
                                        >
                                          <RiRepeatLine />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="form-actions">
                          <motion.button
                            className="cancel-btn"
                            onClick={handleCancel}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={saving}
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            className="save-btn"
                            onClick={handleUpdateRole}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={saving}
                            style={{ backgroundColor: primaryColor }}
                          >
                            {saving ? <LoadingSpinner size="small" color="#000" /> : <RiSaveLine />}
                            {saving ? "Saving..." : "Update Role"}
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="role-permissions-view">
                        {permissionCategories.map((category) => {
                          const categoryPerms = role.permissions?.[category.id];
                          const hasAnyPermission = categoryPerms && 
                            Object.values(categoryPerms).some(perm => perm === true);
                          
                          if (!hasAnyPermission && category.id !== 'events') return null;
                          
                          return (
                            <div key={category.id} className="permission-summary">
                              <category.icon style={{ color: category.color }} />
                              <div className="permission-details">
                                <span className="category-name">{category.title}</span>
                                <div className="active-permissions">
                                  {category.permissions
                                    .filter(perm => categoryPerms?.[perm.key])
                                    .map(perm => perm.label)
                                    .join(", ") || "View only"
                                  }
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Add New Role Button */}
        <motion.button
          className="add-role-btn"
          onClick={() => {
            setNewRole(createInitialRole());
            setEditingRole(null);
            setExpandedRole("new");
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{ 
            borderColor: primaryColor,
            color: primaryColor,
          }}
        >
          <RiAddLine />
          <span>Create New Role</span>
        </motion.button>

        {/* New Role Form */}
        <AnimatePresence>
          {expandedRole === "new" && (
            <motion.div
              className="role-card new-role"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="role-edit-form">
                <div className="form-section">
                  <label className="form-label">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    className={formErrors.name ? "error" : ""}
                    placeholder="Enter role name (e.g., Manager, Staff)"
                  />
                  {formErrors.name && (
                    <div className="error-message">{formErrors.name}</div>
                  )}
                </div>

                {/* Permission Categories */}
                {permissionCategories.map((category) => (
                  <div key={category.id} className="permission-category">
                    <div className="category-header">
                      <category.icon style={{ color: category.color }} />
                      <span>{category.title}</span>
                    </div>
                    <div className="permissions-grid">
                      {category.permissions.map((perm) => (
                        <label key={perm.key} className="permission-item">
                          <input
                            type="checkbox"
                            checked={newRole.permissions[category.id]?.[perm.key] || false}
                            onChange={(e) => handlePermissionChange(
                              category.id, perm.key, e.target.checked
                            )}
                          />
                          <div className="permission-content">
                            <span className="permission-label">{perm.label}</span>
                            <span className="permission-description">{perm.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Custom Codes Section */}
                {codeSettings.length > 0 && (
                  <div className="permission-category">
                    <div className="category-header">
                      <RiCodeLine style={{ color: primaryColor }} />
                      <span>Custom Codes</span>
                    </div>
                    <div className="codes-grid">
                      {codeSettings.map((code) => {
                        const permission = newRole.permissions.codes?.[code.permissionKey] || {};
                        return (
                          <div key={code.permissionKey} className="code-permission-item">
                            <label className="code-toggle">
                              <input
                                type="checkbox"
                                checked={permission.generate || false}
                                onChange={(e) => handleCodePermissionChange(code.permissionKey, {
                                  generate: e.target.checked,
                                })}
                              />
                              <span className="code-name" style={{ color: code.color }}>
                                {code.displayName}
                              </span>
                            </label>

                            {permission.generate && code.hasLimits && (
                              <div className="code-limits">
                                <input
                                  type="number"
                                  min="0"
                                  max={code.maxLimit}
                                  value={permission.unlimited ? "" : permission.limit}
                                  onChange={(e) => handleCodePermissionChange(code.permissionKey, {
                                    limit: parseInt(e.target.value) || 0,
                                    unlimited: false,
                                  })}
                                  disabled={permission.unlimited}
                                  placeholder="0"
                                  className="limit-input"
                                />
                                <button
                                  type="button"
                                  className={`unlimited-btn ${permission.unlimited ? 'active' : ''}`}
                                  onClick={() => handleCodePermissionChange(code.permissionKey, {
                                    unlimited: !permission.unlimited,
                                  })}
                                >
                                  <RiRepeatLine />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <motion.button
                    className="cancel-btn"
                    onClick={handleCancel}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={saving}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    className="save-btn"
                    onClick={handleCreateRole}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={saving}
                    style={{ backgroundColor: primaryColor }}
                  >
                    {saving ? <LoadingSpinner size="small" color="#000" /> : <RiAddLine />}
                    {saving ? "Creating..." : "Create Role"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
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

// Memoize the entire component to prevent unnecessary re-renders
export default React.memo(RoleSetting);