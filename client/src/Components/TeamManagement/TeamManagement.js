import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiUserLine,
  RiCloseLine,
  RiUserUnfollowLine,
  RiShieldUserLine,
  RiSearchLine,
  RiDeleteBin6Line,
  RiFilterLine,
  RiArrowUpDownLine,
  RiUser3Line,
  RiTeamLine,
  RiMailLine,
  RiCalendarLine,
  RiSettings3Line,
  RiEyeLine,
  RiRefreshLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import { useToast } from "../Toast/ToastContext";
import "./TeamManagement.scss";

// Memoized LoadingSpinner component
const LoadingSpinner = React.memo(({ size = "default", color = "#d4af37" }) => {
  const spinnerSize = size === "small" ? "16px" : "24px";
  return (
    <div
      className="team-spinner"
      style={{
        width: spinnerSize,
        height: spinnerSize,
        borderColor: `${color}40`,
        borderTopColor: color,
      }}
    />
  );
});

// Memoized Member Avatar component
const MemberAvatar = React.memo(({ avatar, name, size = "medium" }) => {
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (typeof avatar === "string") return avatar;
    return avatar.medium || avatar.full || avatar.thumbnail;
  };

  const avatarUrl = getAvatarUrl(avatar);
  const sizeClass = size === "small" ? "small" : size === "large" ? "large" : "medium";

  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name}
      className={`member-avatar ${sizeClass}`}
      loading="lazy"
    />
  ) : (
    <div className={`member-avatar-placeholder ${sizeClass}`}>
      <RiUser3Line />
    </div>
  );
});

/**
 * TeamManagement component for managing brand team members
 * @param {Object} props
 * @param {Object} props.brand - Brand object with team data
 * @param {Function} props.onClose - Callback to close the team management modal
 */
const TeamManagement = ({ brand, onClose }) => {
  const toast = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [primaryColor] = useState("#d4af37");
  
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmAction: null,
    type: "warning",
  });

  // Memoized sort options for better performance
  const sortOptions = useMemo(() => [
    { value: "newest", label: "Newest Members" },
    { value: "oldest", label: "Oldest Members" },
    { value: "name", label: "Name (A-Z)" },
    { value: "role", label: "Role" },
  ], []);

  // Fetch roles with error handling
  const fetchRoles = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/roles/brands/${brand._id}/roles`);
      // Filter out the Founder role as it shouldn't be assignable
      setRoles(response.data.filter((role) => !role.isFounder));
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.showError("Failed to load roles");
    }
  }, [brand._id, toast]);

  // Fetch team members with error handling (without roles dependency)
  const fetchTeamMembers = useCallback(async (availableRoles = []) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/brands/${brand._id}/members`);
      
      // Filter out founder members and enhance with role names
      const nonFounderMembers = response.data
        .filter((member) => !member.isFounderRole)
        .map((member) => ({
          ...member,
          // Find role name for display using provided roles or current roles state
          roleName: member.roleName || 
                    availableRoles.find(role => role._id === member.role)?.name || 
                    "Member",
        }));
      
      setMembers(nonFounderMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.showError("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [brand._id, toast]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // First fetch roles
        const response = await axiosInstance.get(`/roles/brands/${brand._id}/roles`);
        const fetchedRoles = response.data.filter((role) => !role.isFounder);
        setRoles(fetchedRoles);
        
        // Then fetch team members with the fetched roles
        await fetchTeamMembers(fetchedRoles);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.showError("Failed to load team data");
        setLoading(false);
      }
    };
    loadData();
  }, [brand._id, fetchTeamMembers, toast]);

  // Handle role change with proper confirmation
  const handleRoleChange = useCallback((memberId, newRoleId) => {
    const member = members.find(m => m._id === memberId);
    const newRole = roles.find((role) => role._id === newRoleId);

    if (!member || !newRole) return;

    setConfirmDialog({
      isOpen: true,
      title: "Change Member Role",
      message: `Change ${member.name}'s role to ${newRole.name}?`,
      type: "warning",
      confirmAction: async () => {
        try {
          setActionLoading(prev => ({ ...prev, [memberId]: true }));
          
          await axiosInstance.put(
            `/brands/${brand._id}/members/${memberId}/role`,
            { roleId: newRoleId }
          );
          
          await fetchTeamMembers(roles);
          toast.showSuccess(`${member.name}'s role updated successfully`);
        } catch (error) {
          console.error("Error updating member role:", error);
          toast.showError("Failed to update member role");
        } finally {
          setActionLoading(prev => ({ ...prev, [memberId]: false }));
        }
      },
    });
  }, [members, roles, brand._id, fetchTeamMembers, toast]);

  // Handle member removal
  const handleRemoveMember = useCallback((memberId) => {
    const member = members.find(m => m._id === memberId);
    if (!member) return;

    setConfirmDialog({
      isOpen: true,
      title: "Remove Team Member",
      message: `Remove ${member.name} from the team? They will lose access to all brand features.`,
      type: "danger",
      confirmAction: async () => {
        try {
          setActionLoading(prev => ({ ...prev, [memberId]: true }));
          
          await axiosInstance.delete(`/brands/${brand._id}/members/${memberId}`);
          await fetchTeamMembers(roles);
          toast.showSuccess(`${member.name} removed from team`);
        } catch (error) {
          console.error("Error removing team member:", error);
          toast.showError("Failed to remove team member");
        } finally {
          setActionLoading(prev => ({ ...prev, [memberId]: false }));
        }
      },
    });
  }, [members, brand._id, fetchTeamMembers, toast]);

  // Handle member ban
  const handleBanMember = useCallback((memberId) => {
    const member = members.find(m => m._id === memberId);
    if (!member) return;

    setConfirmDialog({
      isOpen: true,
      title: "Ban Team Member",
      message: `Ban ${member.name} from the brand? This action cannot be undone and they will be permanently blocked.`,
      type: "danger",
      confirmAction: async () => {
        try {
          setActionLoading(prev => ({ ...prev, [memberId]: true }));
          
          await axiosInstance.post(`/brands/${brand._id}/members/${memberId}/ban`);
          await fetchTeamMembers(roles);
          toast.showSuccess(`${member.name} has been banned`);
        } catch (error) {
          console.error("Error banning member:", error);
          toast.showError("Failed to ban member");
        } finally {
          setActionLoading(prev => ({ ...prev, [memberId]: false }));
        }
      },
    });
  }, [members, brand._id, fetchTeamMembers, toast]);

  // Role filter management
  const toggleRoleFilter = useCallback((roleId) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  }, []);

  const clearRoleFilters = useCallback(() => {
    setSelectedRoles([]);
  }, []);

  // Memoized filtered and sorted members
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = [...members];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(member =>
        member.name?.toLowerCase().includes(query) ||
        member.username?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (selectedRoles.length > 0) {
      filtered = filtered.filter(member => {
        // Handle both ObjectId and string role references
        const memberRoleId = typeof member.role === 'object' ? member.role._id : member.role;
        return selectedRoles.includes(memberRoleId);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.joinedAt || b.createdAt) - new Date(a.joinedAt || a.createdAt);
        case "oldest":
          return new Date(a.joinedAt || a.createdAt) - new Date(b.joinedAt || b.createdAt);
        case "name":
          return a.name?.localeCompare(b.name) || 0;
        case "role":
          return (a.roleName || "").localeCompare(b.roleName || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [members, searchQuery, selectedRoles, sortBy]);

  // Memoized statistics
  const memberStats = useMemo(() => {
    const totalMembers = members.length;
    const filteredCount = filteredAndSortedMembers.length;
    const roleDistribution = {};
    
    members.forEach(member => {
      const roleName = member.roleName || "Member";
      roleDistribution[roleName] = (roleDistribution[roleName] || 0) + 1;
    });

    return { totalMembers, filteredCount, roleDistribution };
  }, [members, filteredAndSortedMembers]);

  if (loading) {
    return (
      <div className="team-management">
        <div className="loading-container">
          <LoadingSpinner color={primaryColor} />
          <p>Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-management">
      {/* Header */}
      <div className="team-header">
        <div className="header-content">
          <RiTeamLine className="header-icon" style={{ color: primaryColor }} />
          <div className="header-text">
            <h2>Team Management</h2>
            <p>Manage team members and roles for {brand.name}</p>
          </div>
        </div>
        
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{memberStats.totalMembers}</span>
            <span className="stat-label">Members</span>
          </div>
          {memberStats.filteredCount !== memberStats.totalMembers && (
            <div className="stat-item filtered">
              <span className="stat-number">{memberStats.filteredCount}</span>
              <span className="stat-label">Filtered</span>
            </div>
          )}
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

      {/* Controls Section */}
      <div className="team-controls">
        <div className="search-section">
          <div className="search-bar">
            <RiSearchLine />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-controls">
          <div className="control-group">
            <label className="control-label">
              <RiArrowUpDownLine />
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="control-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">
              <RiFilterLine />
              Filter by role
            </label>
            <select
              value=""
              onChange={(e) => e.target.value && toggleRoleFilter(e.target.value)}
              className="control-select"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name} {selectedRoles.includes(role._id) ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>

          <motion.button
            className="refresh-btn"
            onClick={async () => {
              try {
                setLoading(true);
                // First fetch roles
                const response = await axiosInstance.get(`/roles/brands/${brand._id}/roles`);
                const fetchedRoles = response.data.filter((role) => !role.isFounder);
                setRoles(fetchedRoles);
                
                // Then fetch team members with the fetched roles
                await fetchTeamMembers(fetchedRoles);
              } catch (error) {
                console.error("Error refreshing data:", error);
                toast.showError("Failed to refresh team data");
                setLoading(false);
              }
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Refresh data"
          >
            <RiRefreshLine />
          </motion.button>
        </div>

        {/* Active Filters */}
        {selectedRoles.length > 0 && (
          <div className="active-filters">
            <span className="filter-label">Active filters:</span>
            <div className="filter-tags">
              {selectedRoles.map((roleId) => {
                const role = roles.find((r) => r._id === roleId);
                return role ? (
                  <motion.span
                    key={roleId}
                    className="filter-tag"
                    onClick={() => toggleRoleFilter(roleId)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {role.name}
                    <RiCloseLine />
                  </motion.span>
                ) : null;
              })}
              <motion.button
                className="clear-filters-btn"
                onClick={clearRoleFilters}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear All
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Members List */}
      <div className="members-container">
        {members.length === 0 ? (
          <div className="empty-state">
            <RiTeamLine />
            <h3>No Team Members</h3>
            <p>Your brand doesn't have any team members yet.</p>
          </div>
        ) : filteredAndSortedMembers.length === 0 ? (
          <div className="empty-state">
            <RiSearchLine />
            <h3>No Matching Members</h3>
            <p>No team members match your current search and filters.</p>
            {(searchQuery || selectedRoles.length > 0) && (
              <motion.button
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery("");
                  clearRoleFilters();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear Search & Filters
              </motion.button>
            )}
          </div>
        ) : (
          <div className="members-grid">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedMembers.map((member) => (
                <motion.div
                  key={member._id}
                  className="member-card"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="member-header">
                    <MemberAvatar 
                      avatar={member.avatar} 
                      name={member.name}
                      size="medium"
                    />
                    <div className="member-info">
                      <h4 className="member-name">{member.name}</h4>
                      <p className="member-username">@{member.username}</p>
                      {member.email && (
                        <p className="member-email">
                          <RiMailLine />
                          {member.email}
                        </p>
                      )}
                      <div className="member-meta">
                        <span className="join-date">
                          <RiCalendarLine />
                          Joined {new Date(member.joinedAt || member.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="member-role-section">
                    <div className="role-info">
                      <label className="role-label">Role</label>
                      {member.isFounderRole ? (
                        <div className="founder-badge">
                          <RiShieldUserLine />
                          <span>Founder</span>
                        </div>
                      ) : (
                        <select
                          className="role-select"
                          value={member.role}
                          onChange={(e) => handleRoleChange(member._id, e.target.value)}
                          disabled={actionLoading[member._id]}
                        >
                          {roles.map((role) => (
                            <option key={role._id} value={role._id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="member-actions">
                    <motion.button
                      className="action-btn remove"
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={member.isFounderRole || actionLoading[member._id]}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Remove from team"
                    >
                      {actionLoading[member._id] ? <LoadingSpinner size="small" /> : <RiDeleteBin6Line />}
                    </motion.button>

                    <motion.button
                      className="action-btn ban"
                      onClick={() => handleBanMember(member._id)}
                      disabled={member.isFounderRole || actionLoading[member._id]}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Ban member"
                    >
                      {actionLoading[member._id] ? <LoadingSpinner size="small" /> : <RiUserUnfollowLine />}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.type === "danger" ? "Confirm" : "Update"}
            type={confirmDialog.type}
            onConfirm={async () => {
              await confirmDialog.confirmAction();
              setConfirmDialog({ ...confirmDialog, isOpen: false });
            }}
            onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Memoize the entire component to prevent unnecessary re-renders
export default React.memo(TeamManagement);