import React, { useState, useEffect, useCallback } from "react";
import "./CoHostRoleSettings.scss";
import {
  RiCloseLine,
  RiSaveLine,
  RiSettingsLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiTeamLine,
  RiBarChartLine,
  RiQrScanLine,
  RiTableLine,
  RiSwordLine,
  RiCodeLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

// Permission toggle component
const PermissionToggle = ({ label, checked, onChange, disabled }) => (
  <label className={`permission-toggle ${disabled ? "disabled" : ""}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <span className="toggle-slider" />
    <span className="toggle-label">{label}</span>
  </label>
);

// Limit input component
const LimitInput = ({ value, onChange, max = 999 }) => (
  <div className="limit-input-wrapper">
    <span className="limit-label">Limit:</span>
    <input
      type="number"
      min="0"
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="limit-input"
    />
  </div>
);

// Permission category component
const PermissionCategory = ({ icon: Icon, title, children }) => (
  <div className="permission-category">
    <div className="category-header">
      <Icon className="category-icon" />
      <h4>{title}</h4>
    </div>
    <div className="category-content">{children}</div>
  </div>
);

// Code permission card component
// Uses code._id as the permission key for stable lookups (not code.name which can vary)
const CodePermissionCard = ({ code, permissions, onChange }) => {
  // Use code._id as key for stable permission lookups (fixes co-host permission mismatch)
  const codeKey = code._id;
  const codePerms = permissions?.codes?.[codeKey] || {};

  return (
    <div className="code-permission-card" style={{ "--code-color": code.color || "#ffc807" }}>
      <div className="code-header">
        <span className="code-name">{code.name}</span>
        {code.isGlobal && <span className="global-badge">Global</span>}
      </div>
      <div className="code-permissions">
        <PermissionToggle
          label="Generate"
          checked={codePerms.generate || false}
          onChange={(val) => onChange(codeKey, "generate", val)}
        />
        <PermissionToggle
          label="Unlimited"
          checked={codePerms.unlimited || false}
          onChange={(val) => onChange(codeKey, "unlimited", val)}
        />
        {!codePerms.unlimited && (
          <LimitInput
            value={codePerms.limit || 0}
            max={code.limit || 999}
            onChange={(val) => onChange(codeKey, "limit", val)}
          />
        )}
      </div>
    </div>
  );
};

// Role card component
const RoleCard = ({
  role,
  roleIndex,
  isExpanded,
  onToggle,
  permissions,
  customCodes,
  onPermissionChange,
  onCodePermissionChange,
  onInheritFromAbove,
  onInheritFromCoHost,
  roles,
  coHostName,
  isInheriting,
}) => {
  return (
    <div className={`role-card ${role.isFounder ? "founder" : ""}`}>
      <div className="role-header" onClick={onToggle}>
        <div className="role-info">
          <h3>
            {role.name}
            {role.isFounder && <span className="founder-badge">Founder</span>}
          </h3>
          {role.description && <p>{role.description}</p>}
        </div>
        <div className="role-toggle-icon">
          {isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="role-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Inherit buttons */}
            <div className="inherit-actions">
              {roleIndex > 0 && (
                <button
                  className="inherit-btn"
                  onClick={() => onInheritFromAbove(roleIndex)}
                >
                  Copy from {roles[roleIndex - 1].name}
                </button>
              )}
              <button
                className="inherit-btn cohost"
                onClick={() => onInheritFromCoHost(roleIndex)}
                disabled={isInheriting}
              >
                <RiDownloadLine />
                {isInheriting ? "Loading..." : `Inherit from ${coHostName}`}
              </button>
            </div>

            {/* Permission categories */}
            <div className="permissions-grid">
              <PermissionCategory icon={RiBarChartLine} title="Analytics">
                <PermissionToggle
                  label="View Analytics"
                  checked={permissions[role._id]?.analytics?.view || false}
                  onChange={(val) => onPermissionChange(role._id, "analytics", "view", val)}
                />
              </PermissionCategory>

              <PermissionCategory icon={RiQrScanLine} title="Scanner">
                <PermissionToggle
                  label="Use Scanner"
                  checked={permissions[role._id]?.scanner?.use || false}
                  onChange={(val) => onPermissionChange(role._id, "scanner", "use", val)}
                />
              </PermissionCategory>

              <PermissionCategory icon={RiTableLine} title="Tables">
                <PermissionToggle
                  label="Access Tables"
                  checked={permissions[role._id]?.tables?.access || false}
                  onChange={(val) => onPermissionChange(role._id, "tables", "access", val)}
                />
                <PermissionToggle
                  label="Manage Tables"
                  checked={permissions[role._id]?.tables?.manage || false}
                  onChange={(val) => onPermissionChange(role._id, "tables", "manage", val)}
                />
                <PermissionToggle
                  label="View Summary"
                  checked={permissions[role._id]?.tables?.summary || false}
                  onChange={(val) => onPermissionChange(role._id, "tables", "summary", val)}
                />
              </PermissionCategory>

              <PermissionCategory icon={RiSwordLine} title="Battles">
                <PermissionToggle
                  label="View Battles"
                  checked={permissions[role._id]?.battles?.view || false}
                  onChange={(val) => onPermissionChange(role._id, "battles", "view", val)}
                />
                <PermissionToggle
                  label="Edit Battles"
                  checked={permissions[role._id]?.battles?.edit || false}
                  onChange={(val) => onPermissionChange(role._id, "battles", "edit", val)}
                />
                <PermissionToggle
                  label="Delete Battles"
                  checked={permissions[role._id]?.battles?.delete || false}
                  onChange={(val) => onPermissionChange(role._id, "battles", "delete", val)}
                />
              </PermissionCategory>
            </div>

            {/* Code permissions */}
            <div className="codes-section">
              <div className="codes-header">
                <RiCodeLine className="codes-icon" />
                <div>
                  <h4>Code Templates</h4>
                  <p>Permissions for main host's code templates</p>
                </div>
              </div>

              {customCodes && customCodes.length > 0 ? (
                <div className="codes-grid">
                  {customCodes.map((code) => (
                    <CodePermissionCard
                      key={code._id || code.name}
                      code={code}
                      permissions={permissions[role._id]}
                      onChange={(codeKey, perm, val) =>
                        onCodePermissionChange(role._id, codeKey, perm, val)
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="no-codes">
                  <p>No code templates found for this event.</p>
                  <span>Code templates must be created by the main host first.</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CoHostRoleSettings = ({
  isOpen,
  onClose,
  coHostBrand,
  eventId,
  onPermissionsUpdate,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [expandedRoles, setExpandedRoles] = useState({});
  const [customCodes, setCustomCodes] = useState([]);
  const [isInheriting, setIsInheriting] = useState(false);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && coHostBrand && eventId) {
      fetchData();
    }
  }, [isOpen, coHostBrand, eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, codesRes] = await Promise.all([
        axiosInstance.get(`/co-hosts/roles/${coHostBrand._id}`),
        axiosInstance.get(`/co-hosts/custom-codes/${eventId}`),
      ]);

      setRoles(rolesRes.data);
      setCustomCodes(codesRes.data);

      // Initialize permissions structure
      const initialPerms = {};
      rolesRes.data.forEach((role) => {
        initialPerms[role._id] = {
          analytics: { view: false },
          codes: {},
          scanner: { use: false },
          tables: { access: false, manage: false, summary: false },
          battles: { view: false, edit: false, delete: false },
        };

        // Initialize code permissions using code._id as key (stable lookup)
        codesRes.data.forEach((code) => {
          initialPerms[role._id].codes[code._id] = {
            generate: false,
            limit: 0,
            unlimited: false,
          };
        });
      });

      setPermissions(initialPerms);

      // Expand first role by default
      if (rolesRes.data.length > 0) {
        setExpandedRoles({ [rolesRes.data[0]._id]: true });
      }

      // Load existing permissions
      await loadExistingPermissions();
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
        setPermissions((prev) => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      // 404 is fine - no existing permissions
      if (error.response?.status !== 404) {
        console.error("Error loading permissions:", error);
      }
    }
  };

  const handlePermissionChange = useCallback((roleId, category, permission, value) => {
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
  }, []);

  const handleCodePermissionChange = useCallback((roleId, codeName, permission, value) => {
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
  }, []);

  const handleInheritFromAbove = useCallback((roleIndex) => {
    if (roleIndex === 0) return;

    const currentRoleId = roles[roleIndex]._id;
    const previousRoleId = roles[roleIndex - 1]._id;
    const previousPerms = permissions[previousRoleId];

    if (previousPerms) {
      setPermissions((prev) => ({
        ...prev,
        [currentRoleId]: JSON.parse(JSON.stringify(previousPerms)),
      }));
      toast.showSuccess(`Inherited from ${roles[roleIndex - 1].name}`);
    }
  }, [roles, permissions, toast]);

  const handleInheritFromCoHost = useCallback(async (roleIndex) => {
    setIsInheriting(true);
    try {
      // Fetch co-host's default permissions AND their brand-level code templates
      const [permsResponse, coHostCodesResponse] = await Promise.all([
        axiosInstance.get(`/co-hosts/default-permissions/${coHostBrand._id}`),
        axiosInstance.get(`/co-hosts/brand-codes/${coHostBrand._id}`),
      ]);

      const coHostPerms = permsResponse.data;
      const coHostBrandCodes = coHostCodesResponse.data?.codes || [];
      const targetRole = roles[roleIndex];

      // Find matching role
      let matching = coHostPerms.find(
        (r) => r.roleName.toLowerCase() === targetRole.name.toLowerCase()
      );
      if (!matching && targetRole.isFounder) {
        matching = coHostPerms.find((r) => r.isFounder);
      }
      if (!matching) {
        matching = coHostPerms.find((r) => r.isDefault) || coHostPerms[0];
      }

      if (matching) {
        const existingCodes = permissions[targetRole._id]?.codes || {};
        const coHostCodePerms = matching.permissions?.codes || {};

        // Build map: co-host code ID -> code name (lowercase)
        const coHostCodeIdToName = {};
        coHostBrandCodes.forEach((code) => {
          if (code._id && code.name) {
            coHostCodeIdToName[code._id] = code.name.toLowerCase().trim();
          }
        });

        // Build map: host code name (lowercase) -> host code ID
        const hostCodeNameToId = {};
        customCodes.forEach((code) => {
          if (code._id && code.name) {
            hostCodeNameToId[code.name.toLowerCase().trim()] = code._id;
          }
        });

        const mergedCodes = { ...existingCodes };

        // Match co-host's code permissions to host's codes BY NAME
        Object.keys(coHostCodePerms).forEach((coHostCodeId) => {
          const coHostCodeName = coHostCodeIdToName[coHostCodeId];
          if (coHostCodeName) {
            // Find host's code with same name
            const hostCodeId = hostCodeNameToId[coHostCodeName];
            if (hostCodeId) {
              // Apply co-host's permission values to host's code
              mergedCodes[hostCodeId] = {
                generate: coHostCodePerms[coHostCodeId]?.generate || false,
                limit: coHostCodePerms[coHostCodeId]?.limit || 0,
                unlimited: coHostCodePerms[coHostCodeId]?.unlimited || false,
              };
            }
          }
        });

        setPermissions((prev) => ({
          ...prev,
          [targetRole._id]: {
            ...matching.permissions,
            codes: mergedCodes,
          },
        }));

        toast.showSuccess(`Inherited from ${matching.roleName}`);
      }
    } catch (error) {
      console.error("Failed to inherit permissions:", error);
      toast.showError("Failed to inherit permissions");
    } finally {
      setIsInheriting(false);
    }
  }, [coHostBrand, roles, permissions, customCodes, toast]);

  const handleInheritAll = useCallback(async () => {
    setIsInheriting(true);
    try {
      // Fetch co-host's default permissions AND their brand-level code templates
      const [permsResponse, coHostCodesResponse] = await Promise.all([
        axiosInstance.get(`/co-hosts/default-permissions/${coHostBrand._id}`),
        axiosInstance.get(`/co-hosts/brand-codes/${coHostBrand._id}`),
      ]);

      const coHostPerms = permsResponse.data;
      const coHostBrandCodes = coHostCodesResponse.data?.codes || [];
      const updatedPerms = { ...permissions };

      // Build map: co-host code ID -> code name (lowercase)
      const coHostCodeIdToName = {};
      coHostBrandCodes.forEach((code) => {
        if (code._id && code.name) {
          coHostCodeIdToName[code._id] = code.name.toLowerCase().trim();
        }
      });

      // Build map: host code name (lowercase) -> host code ID
      const hostCodeNameToId = {};
      customCodes.forEach((code) => {
        if (code._id && code.name) {
          hostCodeNameToId[code.name.toLowerCase().trim()] = code._id;
        }
      });

      roles.forEach((targetRole) => {
        let matching = coHostPerms.find(
          (r) => r.roleName.toLowerCase() === targetRole.name.toLowerCase()
        );
        if (!matching && targetRole.isFounder) {
          matching = coHostPerms.find((r) => r.isFounder);
        }
        if (!matching) {
          matching = coHostPerms.find((r) => r.isDefault) || coHostPerms[0];
        }

        if (matching) {
          const existingCodes = updatedPerms[targetRole._id]?.codes || {};
          const coHostCodePerms = matching.permissions?.codes || {};

          const mergedCodes = { ...existingCodes };

          // Match co-host's code permissions to host's codes BY NAME
          Object.keys(coHostCodePerms).forEach((coHostCodeId) => {
            const coHostCodeName = coHostCodeIdToName[coHostCodeId];
            if (coHostCodeName) {
              // Find host's code with same name
              const hostCodeId = hostCodeNameToId[coHostCodeName];
              if (hostCodeId) {
                // Apply co-host's permission values to host's code
                mergedCodes[hostCodeId] = {
                  generate: coHostCodePerms[coHostCodeId]?.generate || false,
                  limit: coHostCodePerms[coHostCodeId]?.limit || 0,
                  unlimited: coHostCodePerms[coHostCodeId]?.unlimited || false,
                };
              }
            }
          });

          updatedPerms[targetRole._id] = {
            ...matching.permissions,
            codes: mergedCodes,
          };
        }
      });

      setPermissions(updatedPerms);
      toast.showSuccess(`Inherited all permissions from ${coHostBrand.name}`);
    } catch (error) {
      console.error("Failed to inherit permissions:", error);
      toast.showError("Failed to inherit permissions");
    } finally {
      setIsInheriting(false);
    }
  }, [coHostBrand, roles, permissions, customCodes, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.post(`/co-hosts/permissions/${eventId}`, {
        brandId: coHostBrand._id,
        permissions,
      });

      toast.showSuccess("Permissions saved");
      onPermissionsUpdate?.(coHostBrand._id, permissions);
      onClose();
    } catch (error) {
      toast.showError("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !coHostBrand) return null;

  return (
    <motion.div
      className="cohost-settings-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="cohost-settings-panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <div className="header-info">
            <RiSettingsLine className="header-icon" />
            <div>
              <h2>Configure Permissions</h2>
              <p>Set permissions for {coHostBrand.name}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <RiCloseLine />
          </button>
        </div>

        <div className="panel-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading roles...</p>
            </div>
          ) : (
            <>
              {/* Global inherit button */}
              <button
                className="inherit-all-btn"
                onClick={handleInheritAll}
                disabled={isInheriting}
              >
                <RiDownloadLine />
                {isInheriting ? "Inheriting..." : `Inherit All from ${coHostBrand.name}`}
              </button>

              {/* Roles list */}
              <div className="roles-list">
                {roles.map((role, index) => (
                  <RoleCard
                    key={role._id}
                    role={role}
                    roleIndex={index}
                    isExpanded={expandedRoles[role._id]}
                    onToggle={() =>
                      setExpandedRoles((prev) => ({
                        ...prev,
                        [role._id]: !prev[role._id],
                      }))
                    }
                    permissions={permissions}
                    customCodes={customCodes}
                    onPermissionChange={handlePermissionChange}
                    onCodePermissionChange={handleCodePermissionChange}
                    onInheritFromAbove={handleInheritFromAbove}
                    onInheritFromCoHost={handleInheritFromCoHost}
                    roles={roles}
                    coHostName={coHostBrand.name}
                    isInheriting={isInheriting}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="panel-footer">
          <button className="cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving || loading}
          >
            <RiSaveLine />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CoHostRoleSettings;
