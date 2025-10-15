import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RiUserLine,
  RiCloseLine,
  RiUserUnfollowLine,
  RiShieldUserLine,
  RiSearchLine,
  RiDeleteBin6Line,
  RiBanLine,
  RiUser3Line,
  RiFilterLine,
  RiArrowUpDownLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import "./TeamManagement.scss";

const TeamManagement = ({ brand, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState([]); // For multi-role filtering
  const [sortBy, setSortBy] = useState("newest"); // Default to "newest"
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmAction: null,
  });

  // Helper function to get the avatar URL from the avatar object
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (typeof avatar === "string") return avatar;
    return avatar.medium || avatar.full || avatar.thumbnail;
  };

  useEffect(() => {
    fetchTeamMembers();
    fetchRoles();
  }, [brand._id]);

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get(
        `/roles/brands/${brand._id}/roles`
      );
      // Filter out the Founder role as it shouldn't be assignable
      setRoles(response.data.filter((role) => !role.isFounder));
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await axiosInstance.get(`/brands/${brand._id}/members`);
      // Filter out founder members - don't include them in the list at all
      const nonFounderMembers = response.data.filter(
        (member) => !member.isFounderRole
      );
      setMembers(nonFounderMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (memberId, newRoleId) => {
    // Find the role object by ID
    const newRole = roles.find((role) => role._id === newRoleId);

    setConfirmDialog({
      isOpen: true,
      title: "Change Role",
      message: `Are you sure you want to change this user's role to ${
        newRole ? newRole.name : "the selected role"
      }?`,
      confirmAction: async () => {
        try {
          await axiosInstance.put(
            `/brands/${brand._id}/members/${memberId}/role`,
            { roleId: newRoleId } // Send roleId instead of role string
          );
          await fetchTeamMembers();
        } catch (error) {
          console.error("Error updating member role:", error);
        }
      },
    });
  };

  const handleRemoveMember = (memberId) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Member",
      message: "Are you sure you want to remove this member from the team?",
      confirmAction: async () => {
        try {
          await axiosInstance.delete(
            `/brands/${brand._id}/members/${memberId}`
          );
          await fetchTeamMembers();
        } catch (error) {
          console.error("Error removing team member:", error);
        }
      },
    });
  };

  const handleBanMember = (memberId) => {
    setConfirmDialog({
      isOpen: true,
      title: "Ban Member",
      message:
        "Are you sure you want to ban this member? This action cannot be undone.",
      confirmAction: async () => {
        try {
          await axiosInstance.post(
            `/brands/${brand._id}/members/${memberId}/ban`
          );
          await fetchTeamMembers();
        } catch (error) {
          console.error("Error banning member:", error);
        }
      },
    });
  };

  const toggleRoleFilter = (roleId) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const clearRoleFilters = () => {
    setSelectedRoles([]);
  };

  // Filter and sort members
  const getFilteredAndSortedMembers = () => {
    let filtered = members;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (selectedRoles.length > 0) {
      filtered = filtered.filter((member) =>
        selectedRoles.includes(member.role)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.joinedAt || b.createdAt) - new Date(a.joinedAt || a.createdAt);
        case "oldest":
          return new Date(a.joinedAt || a.createdAt) - new Date(b.joinedAt || b.createdAt);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return sorted;
  };

  const filteredMembers = getFilteredAndSortedMembers();

  return (
    <motion.div
      className="team-management"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="interface-header">
        <h2>Team Management</h2>
        <button className="close-btn" onClick={onClose}>
          <RiCloseLine />
        </button>
      </div>

      <div className="filters-section">
        {/* Search Bar */}
        <div className="search-bar">
          <RiSearchLine className="search-icon" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Compact Controls Row */}
        <div className="compact-controls">
          {/* Sort Dropdown */}
          <div className="sort-control">
            <RiArrowUpDownLine className="control-icon" />
            <select
              className="control-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* Role Filter Dropdown */}
          <div className="role-filter-control">
            <RiFilterLine className="control-icon" />
            <select
              className="control-select"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  toggleRoleFilter(e.target.value);
                }
              }}
            >
              <option value="">Filter by Role</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                  {selectedRoles.includes(role._id) ? " ✓" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filters */}
          {selectedRoles.length > 0 && (
            <div className="active-filters">
              {selectedRoles.map((roleId) => {
                const role = roles.find((r) => r._id === roleId);
                return role ? (
                  <span
                    key={roleId}
                    className="filter-tag"
                    onClick={() => toggleRoleFilter(roleId)}
                  >
                    {role.name}
                    <span className="remove-icon">×</span>
                  </span>
                ) : null;
              })}
              <button className="clear-all-btn" onClick={clearRoleFilters}>
                Clear All
              </button>
            </div>
          )}

          {/* Members Count - Subtle */}
          {(searchQuery || selectedRoles.length > 0) && (
            <span className="members-count-subtle">
              {filteredMembers.length}/{members.length}
            </span>
          )}
        </div>
      </div>

      <div className="members-list">
        {loading ? (
          <div className="loading-state">Loading team members...</div>
        ) : members.length === 0 ? (
          <div className="empty-state">No team members yet</div>
        ) : filteredMembers.length === 0 ? (
          <div className="empty-state">No members match your filters</div>
        ) : (
          filteredMembers.map((member) => (
            <motion.div
              key={member._id}
              className="member-item"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              layout
            >
              <div className="member-info">
                {member.avatar && getAvatarUrl(member.avatar) ? (
                  <img
                    src={getAvatarUrl(member.avatar)}
                    alt={member.name}
                    className="member-avatar"
                  />
                ) : (
                  <div className="member-avatar-placeholder">
                    <RiUser3Line className="placeholder-icon" />
                  </div>
                )}
                <div className="member-details">
                  <span className="member-name">{member.name}</span>
                  <span className="member-username">@{member.username}</span>
                  <span className="member-role">{member.roleName}</span>
                </div>
              </div>

              <div className="member-actions">
                {member.isFounderRole ? (
                  <div className="role-badge founder">
                    <RiShieldUserLine />
                    <span>Founder</span>
                  </div>
                ) : (
                  <select
                    className="role-select"
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member._id, e.target.value)
                    }
                  >
                    {roles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  className="action-btn remove"
                  onClick={() => handleRemoveMember(member._id)}
                  title="Remove member"
                  disabled={member.isFounderRole}
                >
                  <RiDeleteBin6Line />
                </button>

                <button
                  className="action-btn ban"
                  onClick={() => handleBanMember(member._id)}
                  title="Ban member"
                  disabled={member.isFounderRole}
                >
                  <RiUserUnfollowLine />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={async () => {
            await confirmDialog.confirmAction();
            setConfirmDialog({ ...confirmDialog, isOpen: false });
          }}
          onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />
      )}
    </motion.div>
  );
};

export default TeamManagement;
