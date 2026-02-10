import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiLockLine,
  RiTeamLine,
  RiCodeLine,
  RiShieldCheckLine,
  RiSettings3Line,
  RiTableLine,
  RiSwordLine,
  RiQrScanLine,
  RiBarChartBoxLine,
  RiSaveLine,
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
 * Redesigned with side-by-side layout: compact list (left) + form (right)
 */
const RoleSetting = ({ brand, onClose }) => {
  const { user } = useContext(AuthContext);
  const toast = useToast();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [codeSettings, setCodeSettings] = useState([]);
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if the current user is the brand owner
  const isBrandOwner = useCallback(() => {
    if (!user || !brand) return false;
    const ownerId = typeof brand.owner === "object" ? brand.owner._id : brand.owner;
    return ownerId === user._id;
  }, [user, brand]);

  // Memoize permission categories
  const permissionCategories = useMemo(() => [
    {
      id: 'events',
      title: 'Events',
      icon: RiSettings3Line,
      color: primaryColor,
      permissions: [
        { key: 'create', label: 'Create' },
        { key: 'edit', label: 'Edit' },
        { key: 'delete', label: 'Delete' },
        { key: 'view', label: 'View' },
      ]
    },
    {
      id: 'team',
      title: 'Team',
      icon: RiTeamLine,
      color: '#4ade80',
      permissions: [
        { key: 'manage', label: 'Manage' },
        { key: 'view', label: 'View' },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: RiBarChartBoxLine,
      color: '#3b82f6',
      permissions: [
        { key: 'view', label: 'View' },
      ]
    },
    {
      id: 'scanner',
      title: 'Scanner',
      icon: RiQrScanLine,
      color: '#8b5cf6',
      permissions: [
        { key: 'use', label: 'Use' },
      ]
    },
    {
      id: 'tables',
      title: 'Tables',
      icon: RiTableLine,
      color: '#f59e0b',
      permissions: [
        { key: 'access', label: 'Access' },
        { key: 'manage', label: 'Manage' },
        { key: 'summary', label: 'Reports' },
      ]
    },
    {
      id: 'battles',
      title: 'Battles',
      icon: RiSwordLine,
      color: '#ef4444',
      permissions: [
        { key: 'view', label: 'View' },
        { key: 'edit', label: 'Edit' },
        { key: 'delete', label: 'Delete' },
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

  const [formData, setFormData] = useState(createInitialRole);

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
      const response = await axiosInstance.get(`/code-settings/brands/${brand._id}/codes`);

      if (response.data?.codes?.length > 0) {
        const brandCodes = response.data.codes.map(code => ({
          id: code._id,
          name: code.name,
          type: code.type || "custom",
          permissionKey: code._id,
          displayName: code.name,
          color: code.color || primaryColor,
          icon: code.icon || "RiCodeLine",
          hasLimits: true,
          maxLimit: code.limit || 999,
          isGlobal: code.isGlobalForBrand,
        }));

        setCodeSettings(brandCodes);
        return;
      }
    } catch (error) {
      // Silent fail
    }
  }, [brand._id, primaryColor]);

  // Load data on mount
  useEffect(() => {
    fetchRoles();
    fetchCodeSettings();
  }, [fetchRoles, fetchCodeSettings]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Role name is required";
    } else if (formData.name.toUpperCase() === "FOUNDER" && selectedRole !== "new") {
      const existingRole = roles.find(r => r._id === selectedRole);
      if (!existingRole?.isFounder) {
        errors.name = "Cannot rename to Founder";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.name, selectedRole, roles]);

  // Handle role creation
  const handleCreateRole = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const response = await axiosInstance.post(
        `/roles/brands/${brand._id}/roles`,
        { ...formData, name: formData.name.toUpperCase() }
      );

      setRoles(prev => [...prev, response.data]);
      setSelectedRole(response.data._id);
      setHasChanges(false);
      toast.showSuccess("Role created successfully");
    } catch (error) {
      toast.showError(error.response?.data?.message || "Failed to create role");
    } finally {
      setSaving(false);
    }
  }, [validateForm, formData, brand._id, toast]);

  // Handle role update
  const handleUpdateRole = useCallback(async () => {
    if (!validateForm() || selectedRole === "new") return;

    try {
      setSaving(true);
      const response = await axiosInstance.put(
        `/roles/brands/${brand._id}/roles/${selectedRole}`,
        { ...formData, name: formData.name.toUpperCase() }
      );

      setRoles(prev => prev.map(role =>
        role._id === selectedRole ? response.data : role
      ));

      setHasChanges(false);
      toast.showSuccess("Role updated successfully");
    } catch (error) {
      toast.showError(error.response?.data?.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  }, [validateForm, selectedRole, formData, brand._id, toast]);

  // Handle role deletion
  const handleDeleteRole = useCallback(async () => {
    if (!roleToDelete) return;

    try {
      await axiosInstance.delete(`/roles/brands/${brand._id}/roles/${roleToDelete._id}`);
      setRoles(prev => prev.filter(role => role._id !== roleToDelete._id));
      if (selectedRole === roleToDelete._id) {
        setSelectedRole(null);
        setFormData(createInitialRole());
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

  // Handle selecting a role - immediately enter edit mode
  const handleSelectRole = useCallback((role) => {
    if (selectedRole === role._id) return;

    setSelectedRole(role._id);
    setHasChanges(false);

    // Initialize form with role data
    const roleFormData = {
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

    // Initialize code permissions
    codeSettings.forEach(code => {
      const existing = role.permissions?.codes?.[code.permissionKey] || {};
      roleFormData.permissions.codes[code.permissionKey] = {
        generate: Boolean(existing.generate),
        limit: parseInt(existing.limit) || 0,
        unlimited: Boolean(existing.unlimited),
      };
    });

    setFormData(roleFormData);
    setFormErrors({});
  }, [selectedRole, codeSettings]);

  // Handle creating new role
  const handleStartCreate = useCallback(() => {
    setSelectedRole("new");
    setHasChanges(false);

    const newRoleData = createInitialRole();
    // Initialize code permissions
    codeSettings.forEach(code => {
      newRoleData.permissions.codes[code.permissionKey] = {
        generate: false,
        limit: 0,
        unlimited: false,
      };
    });

    setFormData(newRoleData);
    setFormErrors({});
  }, [createInitialRole, codeSettings]);

  // Handle permission changes
  const handlePermissionChange = useCallback((category, key, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  }, []);

  // Handle code permission changes
  const handleCodePermissionChange = useCallback((permissionKey, changes) => {
    const codeSetting = codeSettings.find(code => code.permissionKey === permissionKey);
    const maxLimit = codeSetting?.maxLimit || 999;

    if (changes.limit !== undefined) {
      changes.limit = Math.min(changes.limit, maxLimit);
    }

    setFormData(prev => ({
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
    setHasChanges(true);
  }, [codeSettings]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setSelectedRole(null);
    setFormData(createInitialRole());
    setFormErrors({});
    setHasChanges(false);
  }, [createInitialRole]);

  // Check if role can be edited
  const canEditRole = useCallback((role) => {
    return role.isFounder || !role.isDefault || user?.isDeveloper;
  }, [user]);

  // Check if role can be deleted
  const canDeleteRole = useCallback((role) => {
    return !role.isDefault && !role.isFounder;
  }, []);

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

      <div className="role-settings-content">
        {/* Compact Role List (Left Side) */}
        <aside className="roles-list">
          {roles.map((role) => (
            <div
              key={role._id}
              className={`role-list-item ${role.isFounder ? "founder" : ""} ${
                selectedRole === role._id ? "selected" : ""
              }`}
              onClick={() => handleSelectRole(role)}
            >
              <div className="role-info">
                <span className="role-name">{role.name}</span>
                <div className="role-badges">
                  {role.isFounder && <span className="badge founder">★</span>}
                  {role.isDefault && !role.isFounder && <span className="badge default">D</span>}
                </div>
              </div>

              {/* Delete button for deletable roles */}
              {canDeleteRole(role) && (
                <button
                  className="delete-btn"
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

              {/* Lock icon for non-editable roles */}
              {!canEditRole(role) && (
                <span className="lock-icon" title="Cannot edit default role">
                  <RiLockLine />
                </span>
              )}
            </div>
          ))}

          {/* Add New Role */}
          <div
            className={`role-list-item add-new ${selectedRole === "new" ? "selected" : ""}`}
            onClick={handleStartCreate}
          >
            <RiAddLine className="add-icon" />
            <span>New Role</span>
          </div>
        </aside>

        {/* Form Panel (Right Side) */}
        <main className="role-form-panel">
          <AnimatePresence mode="wait">
            {selectedRole ? (
              <motion.div
                key={selectedRole}
                className="role-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {/* Role Name */}
                <div className="form-section name-section">
                  <label>Role Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      setHasChanges(true);
                    }}
                    className={formErrors.name ? "error" : ""}
                    placeholder="Enter role name"
                    disabled={selectedRole !== "new" && roles.find(r => r._id === selectedRole)?.isFounder}
                  />
                  {formErrors.name && <span className="error-msg">{formErrors.name}</span>}
                </div>

                {/* Permission Categories */}
                <div className="permissions-section">
                  {permissionCategories.map((category) => (
                    <div key={category.id} className="permission-category">
                      <div className="category-header">
                        <category.icon style={{ color: category.color }} />
                        <span>{category.title}</span>
                      </div>
                      <div className="permission-toggles">
                        {category.permissions.map((perm) => {
                          const isChecked = formData.permissions[category.id]?.[perm.key] || false;
                          return (
                            <div
                              key={perm.key}
                              className={`permission-toggle ${isChecked ? 'checked' : ''}`}
                              onClick={() => handlePermissionChange(category.id, perm.key, !isChecked)}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                readOnly
                              />
                              <span>{perm.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Custom Codes */}
                  {codeSettings.length > 0 && (
                    <div className="permission-category codes-category">
                      <div className="category-header">
                        <RiCodeLine style={{ color: primaryColor }} />
                        <span>Custom Codes</span>
                      </div>
                      <div className="codes-list">
                        {codeSettings.map((code) => {
                          const permission = formData.permissions.codes?.[code.permissionKey] || {};
                          return (
                            <div key={code.permissionKey} className="code-item">
                              <div
                                className={`code-toggle ${permission.generate ? 'checked' : ''}`}
                                onClick={() => handleCodePermissionChange(code.permissionKey, {
                                  generate: !permission.generate,
                                })}
                              >
                                <input
                                  type="checkbox"
                                  checked={permission.generate || false}
                                  onChange={() => {}}
                                  readOnly
                                />
                                <span style={{ color: code.color }}>{code.displayName}</span>
                              </div>

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
                                  />
                                  <button
                                    type="button"
                                    className={`unlimited-btn ${permission.unlimited ? 'active' : ''}`}
                                    onClick={() => handleCodePermissionChange(code.permissionKey, {
                                      unlimited: !permission.unlimited,
                                    })}
                                    title="Unlimited"
                                  >
                                    ∞
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button
                    className="cancel-btn"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={selectedRole === "new" ? handleCreateRole : handleUpdateRole}
                    disabled={saving || !hasChanges}
                    style={{ backgroundColor: primaryColor }}
                  >
                    {saving ? (
                      <LoadingSpinner size="small" color="#000" />
                    ) : (
                      <RiSaveLine />
                    )}
                    {saving ? "Saving..." : (selectedRole === "new" ? "Create" : "Save")}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RiShieldCheckLine className="empty-icon" />
                <p>Select a role to edit permissions</p>
                <span>or create a new role</span>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && roleToDelete && (
          <ConfirmDialog
            title="Delete Role"
            message={`Are you sure you want to delete "${roleToDelete.name}"?`}
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

export default React.memo(RoleSetting);
