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
        friends: {
          generate: false,
          limit: 0,
          unlimited: false,
        },
        backstage: {
          generate: false,
          limit: 0,
          unlimited: false,
        },
        table: {
          generate: false,
        },
        ticket: {
          generate: false,
        },
        guest: {
          generate: false,
        },
      },
      scanner: {
        use: false,
      },
    },
  });

  useEffect(() => {
    fetchRoles();
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
      setNewRole({
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
            friends: {
              generate: false,
              limit: 0,
              unlimited: false,
            },
            backstage: {
              generate: false,
              limit: 0,
              unlimited: false,
            },
            table: {
              generate: false,
            },
            ticket: {
              generate: false,
            },
            guest: {
              generate: false,
            },
          },
          scanner: {
            use: false,
          },
        },
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating role:", error);
    }
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
    setNewRole((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        codes: {
          ...prev.permissions.codes,
          [codeType]: {
            ...prev.permissions.codes[codeType],
            ...changes,
          },
        },
      },
    }));
  };

  const handleStartEdit = (role) => {
    if (role.name === "OWNER") return;
    setEditingRole(role);
    setNewRole({
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
        codes: {
          friends: {
            generate: role.permissions?.codes?.friends?.generate || false,
            limit: role.permissions?.codes?.friends?.limit || 0,
            unlimited: role.permissions?.codes?.friends?.unlimited || false,
          },
          backstage: {
            generate: role.permissions?.codes?.backstage?.generate || false,
            limit: role.permissions?.codes?.backstage?.limit || 0,
            unlimited: role.permissions?.codes?.backstage?.unlimited || false,
          },
          table: {
            generate: role.permissions?.codes?.table?.generate || false,
          },
          ticket: {
            generate: role.permissions?.codes?.ticket?.generate || false,
          },
          guest: {
            generate: role.permissions?.codes?.guest?.generate || false,
          },
        },
        scanner: {
          use: role.permissions?.scanner?.use || false,
        },
      },
    });
    setShowCreateForm(true);
  };

  const handleUpdateRole = async () => {
    if (!newRole.name.trim() || !editingRole) return;

    try {
      const normalizedRole = {
        ...newRole,
        name: newRole.name.toUpperCase(),
      };

      const response = await axiosInstance.put(
        `/roles/brands/${brand._id}/roles/${editingRole._id}`,
        normalizedRole
      );
      setRoles(
        roles.map((role) =>
          role._id === editingRole._id ? response.data : role
        )
      );
      setShowCreateForm(false);
      setEditingRole(null);
    } catch (error) {
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

  const renderCodePermission = (title, codeType) => {
    const permission = newRole.permissions.codes[codeType];
    const isCodeWithLimit = ["friends", "backstage"].includes(codeType);

    return (
      <div className="permission-item">
        <div className="permission-header">
          <label className="switch">
            <input
              type="checkbox"
              checked={
                isCodeWithLimit ? permission.generate : permission.generate
              }
              onChange={(e) =>
                handleCodePermissionChange(codeType, {
                  generate: e.target.checked,
                })
              }
            />
            <span className="slider"></span>
          </label>
          <span className="permission-title">{title}</span>
        </div>

        {isCodeWithLimit && permission.generate && (
          <div className="code-limit-section">
            <div className="limit-input-wrapper">
              <input
                type="number"
                min="0"
                value={permission.unlimited ? "∞" : permission.limit}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") return;
                  handleCodePermissionChange(codeType, {
                    limit: parseInt(value) || 0,
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
              onClick={() =>
                handleCodePermissionChange(codeType, {
                  unlimited: !permission.unlimited,
                  limit: !permission.unlimited ? 0 : permission.limit,
                })
              }
            >
              <RiRepeatFill />
              <span>Unlimited</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
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
        onClick={() => setShowCreateForm(true)}
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

              <h4>Code Permissions</h4>
              <div className="permission-group">
                {renderCodePermission("Friends Code", "friends")}
                {renderCodePermission("Backstage Code", "backstage")}
                {renderCodePermission("Table Code", "table")}
                {renderCodePermission("Ticket Code", "ticket")}
                {renderCodePermission("Guest Code", "guest")}
              </div>

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
                  setNewRole({
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
                        friends: {
                          generate: false,
                          limit: 0,
                          unlimited: false,
                        },
                        backstage: {
                          generate: false,
                          limit: 0,
                          unlimited: false,
                        },
                        table: {
                          generate: false,
                        },
                        ticket: {
                          generate: false,
                        },
                        guest: {
                          generate: false,
                        },
                      },
                      scanner: {
                        use: false,
                      },
                    },
                  });
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
