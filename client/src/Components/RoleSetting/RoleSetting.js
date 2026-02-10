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
  const [selectedRole, setSelectedRole] = useState(null);
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

  // Fetch brand-level codes from consolidated CodeSettings
  const fetchCodeSettings = useCallback(async () => {
    try {
      // Use new consolidated CodeSettings endpoint
      const response = await axiosInstance.get(`/code-settings/brands/${brand._id}/codes`);

      if (response.data?.codes?.length > 0) {
        const brandCodes = response.data.codes.map(code => ({
          id: code._id,
          name: code.name,
          type: code.type || "custom",
          // Use _id as permission key (going forward)
          permissionKey: code._id,
          displayName: code.name,
          color: code.color || primaryColor,
          icon: code.icon || "RiCodeLine",
          hasLimits: true,
          maxLimit: code.limit || 999,
          isGlobal: code.isGlobalForBrand,
        }));

        setCodeSettings(brandCodes);
        initializeRoleWithCodePermissions(brandCodes);
        return;
      }
    } catch (error) {
      // New endpoint failed, try fallback to legacy
    }

    // Fallback to legacy event-based approach for backward compatibility
    await fetchLegacyCodeSettings();
  }, [brand._id, primaryColor]);

  // Legacy fallback for backward compatibility
  const fetchLegacyCodeSettings = useCallback(async () => {
    try {
      const eventsResponse = await axiosInstance.get(`/events/brand/${brand._id}`);

      if (eventsResponse.data?.length > 0) {
        const parentEvents = eventsResponse.data.filter(event => !event.parentEventId);
        const allCustomCodes = [];

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
                permissionKey: `${event._id}_${code.name}`,
                displayName: `${code.name} (${event.title})`,
                color: code.color || primaryColor,
                hasLimits: true,
                maxLimit: code.limit || 999,
              }));

            allCustomCodes.push(...customCodes);
          }
        }

        setCodeSettings(allCustomCodes);
        initializeRoleWithCodePermissions(allCustomCodes);
      }
    } catch (error) {
      // Silent fail for legacy code settings
    }
  }, [brand._id, primaryColor]);

  // Initialize role with code permissions
  const initializeRoleWithCodePermissions = useCallback((codeTypes) => {
    const codePermissions = {};
    codeTypes.forEach(code => {
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
      setSelectedRole(null);
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
      setSelectedRole(null);
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
      if (selectedRole === roleToDelete._id) {
        setSelectedRole(null);
        setEditingRole(null);
        setNewRole(createInitialRole());
      }
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
  }, [roleToDelete, brand._id, toast, selectedRole, createInitialRole]);

  // Handle selecting a role card
  const handleSelectRole = useCallback((role) => {
    if (selectedRole === role._id && !editingRole) {
      // Clicking the already selected role deselects it
      setSelectedRole(null);
      return;
    }
    setSelectedRole(role._id);
    setEditingRole(null);
    setNewRole({
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
    });
    setFormErrors({});
  }, [selectedRole, editingRole]);

  // Handle starting role edit
  const handleStartEdit = useCallback((role, e) => {
    if (e) e.stopPropagation();
    setSelectedRole(role._id);
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

    // Initialize custom code permissions using permissionKey (_id)
    codeSettings.forEach(code => {
      const existing = role.permissions?.codes?.[code.permissionKey] || {};
      editFormData.permissions.codes[code.permissionKey] = {
        generate: Boolean(existing.generate),
        limit: parseInt(existing.limit) || 0,
        unlimited: Boolean(existing.unlimited),
      };
    });

    setNewRole(editFormData);
    setFormErrors({});
  }, [codeSettings]);

  // Handle clicking "Create New Role" card
  const handleStartCreate = useCallback(() => {
    setSelectedRole("new");
    setEditingRole(null);
    setNewRole(createInitialRole());
    setFormErrors({});
  }, [createInitialRole]);

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

  // Handle code permission changes
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
    setSelectedRole(null);
    setNewRole(createInitialRole());
    setFormErrors({});
  }, [createInitialRole]);

  // Get the currently selected role object
  const selectedRoleData = useMemo(() => {
    if (!selectedRole || selectedRole === "new") return null;
    return roles.find(r => r._id === selectedRole);
  }, [selectedRole, roles]);

  // Check if we're in edit/create mode
  const isFormMode = selectedRole === "new" || editingRole;

  // Render the permission form (shared between create and edit)
  const renderPermissionForm = () => (
    <div className="role-edit-form">
      <div className="form-row">
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

      <div className="form-footer">
        <button
          className="cancel-btn"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className="save-btn"
          onClick={editingRole ? handleUpdateRole : handleCreateRole}
          disabled={saving}
          style={{ backgroundColor: primaryColor }}
        >
          {saving ? <LoadingSpinner size="small" color="#000" /> : (editingRole ? <RiSaveLine /> : <RiAddLine />)}
          {saving ? "Saving..." : (editingRole ? "Update Role" : "Create Role")}
        </button>
      </div>
    </div>
  );

  // Render view-only permission summary
  const renderPermissionSummary = (role) => (
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

      {/* Show code permissions in summary if any exist */}
      {codeSettings.length > 0 && (() => {
        const activeCodes = codeSettings.filter(code => {
          const perm = role.permissions?.codes?.[code.permissionKey];
          return perm?.generate;
        });
        if (activeCodes.length === 0) return null;
        return (
          <div className="permission-summary">
            <RiCodeLine style={{ color: primaryColor }} />
            <div className="permission-details">
              <span className="category-name">Custom Codes</span>
              <div className="active-permissions">
                {activeCodes.map(code => {
                  const perm = role.permissions.codes[code.permissionKey];
                  const limitText = perm.unlimited ? "unlimited" : `limit: ${perm.limit}`;
                  return `${code.displayName} (${limitText})`;
                }).join(", ")}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  if (loading) {
    return (
      <div className="role-settings">
        <div className="loading-state">
          <div className="spinner" />
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
            <p>Manage team roles and permissions</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <RiCloseLine />
        </button>
      </div>

      <div className="role-settings-body">
        {/* Horizontal role cards */}
        <div className="roles-grid">
          {roles.map((role) => (
            <div
              key={role._id}
              className={`role-card ${role.isFounder ? "founder" : ""} ${
                selectedRole === role._id ? "selected" : ""
              }`}
              onClick={() => handleSelectRole(role)}
            >
              {/* Card actions on hover */}
              <div className="card-actions">
                {(role.isFounder || !role.isDefault || user?.isDeveloper) && (
                  <button
                    className="action-btn edit"
                    onClick={(e) => handleStartEdit(role, e)}
                    title="Edit role"
                  >
                    <RiEditLine />
                  </button>
                )}
                {role.isDefault && !role.isFounder && !user?.isDeveloper && (
                  <button
                    className="action-btn locked"
                    title="Only developers can edit default roles"
                  >
                    <RiLockLine />
                  </button>
                )}
                {!role.isDefault && !role.isFounder && (
                  <button
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoleToDelete(role);
                      setShowDeleteConfirm(true);
                    }}
                    title="Delete role"
                  >
                    <RiDeleteBin6Line />
                  </button>
                )}
              </div>

              <div className="card-icon" style={{ background: `${role.isFounder ? primaryColor : '#333'}30` }}>
                {role.isFounder ? (
                  <RiShieldCheckLine style={{ color: primaryColor }} />
                ) : (
                  <RiTeamLine style={{ color: '#888' }} />
                )}
              </div>
              <div className="card-content">
                <h4>{role.name}</h4>
                <div className="card-badges">
                  {role.isDefault && <span className="badge default">Default</span>}
                  {role.isFounder && <span className="badge founder">Founder</span>}
                </div>
              </div>
            </div>
          ))}

          {/* Add New Role card */}
          <div
            className={`role-card add-new ${selectedRole === "new" ? "selected" : ""}`}
            onClick={handleStartCreate}
          >
            <div className="add-icon" style={{ background: `${primaryColor}20` }}>
              <RiAddLine style={{ color: primaryColor }} />
            </div>
            <div className="card-content">
              <h4>New Role</h4>
              <p>Create custom role</p>
            </div>
          </div>
        </div>

        {/* Form / Summary area below cards */}
        <AnimatePresence mode="wait">
          {selectedRole && (
            <motion.div
              key={selectedRole + (editingRole ? '-edit' : '-view')}
              className="role-detail-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedRole === "new" ? (
                renderPermissionForm()
              ) : editingRole ? (
                renderPermissionForm()
              ) : selectedRoleData ? (
                <div className="role-view-panel">
                  <div className="view-header">
                    <h3>{selectedRoleData.name}</h3>
                    {(selectedRoleData.isFounder || !selectedRoleData.isDefault || user?.isDeveloper) && (
                      <button
                        className="edit-btn"
                        onClick={() => handleStartEdit(selectedRoleData)}
                      >
                        <RiEditLine />
                        Edit
                      </button>
                    )}
                  </div>
                  {renderPermissionSummary(selectedRoleData)}
                </div>
              ) : null}
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
