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
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import "./UserInterface.scss";

const UserInterface = ({ brand, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
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
      // Filter out the OWNER role as it shouldn't be assignable
      setRoles(response.data.filter((role) => role.name !== "OWNER"));
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await axiosInstance.get(`/brands/${brand._id}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (memberId, newRole) => {
    // Don't allow changing to OWNER role
    if (newRole === "OWNER") return;

    setConfirmDialog({
      isOpen: true,
      title: "Change Role",
      message: `Are you sure you want to change this user's role to ${newRole}?`,
      confirmAction: async () => {
        try {
          await axiosInstance.put(
            `/brands/${brand._id}/members/${memberId}/role`,
            { role: newRole }
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

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      className="user-interface"
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

      <div className="search-bar">
        <RiSearchLine className="search-icon" />
        <input
          type="text"
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="members-list">
        {loading ? (
          <div className="loading-state">Loading team members...</div>
        ) : members.length === 0 ? (
          <div className="empty-state">No team members yet</div>
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
                  <span className="member-role">{member.role}</span>
                </div>
              </div>

              <div className="member-actions">
                <select
                  className="role-select"
                  value={member.role}
                  onChange={(e) => handleRoleChange(member._id, e.target.value)}
                  disabled={member.role === "OWNER"}
                >
                  {roles.map((role) => (
                    <option key={role._id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>

                <button
                  className="action-btn remove"
                  onClick={() => handleRemoveMember(member._id)}
                  title="Remove member"
                  disabled={member.role === "OWNER"}
                >
                  <RiDeleteBin6Line />
                </button>

                <button
                  className="action-btn ban"
                  onClick={() => handleBanMember(member._id)}
                  title="Ban member"
                  disabled={member.role === "OWNER"}
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

export default UserInterface;
