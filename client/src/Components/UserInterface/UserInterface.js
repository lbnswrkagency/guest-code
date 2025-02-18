import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RiUserLine,
  RiCloseLine,
  RiUserUnfollowLine,
  RiShieldUserLine,
  RiSearchLine,
  RiDeleteBin6Line,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import "./UserInterface.scss";

const UserInterface = ({ brand, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, [brand._id]);

  const fetchTeamMembers = async () => {
    try {
      const response = await axiosInstance.get(
        `/api/brands/${brand._id}/members`
      );
      setMembers(response.data);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (
      window.confirm(
        `Are you sure you want to change this user's role to ${newRole}?`
      )
    ) {
      try {
        await axiosInstance.put(
          `/api/brands/${brand._id}/members/${memberId}/role`,
          {
            role: newRole,
          }
        );
        fetchTeamMembers(); // Refresh the list
      } catch (error) {
        console.error("Error updating member role:", error);
      }
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this member from the team?"
      )
    ) {
      try {
        await axiosInstance.delete(
          `/api/brands/${brand._id}/members/${memberId}`
        );
        fetchTeamMembers(); // Refresh the list
      } catch (error) {
        console.error("Error removing team member:", error);
      }
    }
  };

  const handleBanMember = async (memberId) => {
    if (
      window.confirm(
        "Are you sure you want to ban this member? This action cannot be undone."
      )
    ) {
      try {
        await axiosInstance.post(
          `/api/brands/${brand._id}/members/${memberId}/ban`
        );
        fetchTeamMembers(); // Refresh the list
      } catch (error) {
        console.error("Error banning member:", error);
      }
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="member-avatar"
                  />
                ) : (
                  <div className="member-avatar-placeholder">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="member-details">
                  <span className="member-name">{member.name}</span>
                  <span className="member-role">{member.role}</span>
                </div>
              </div>

              <div className="member-actions">
                <select
                  className="role-select"
                  value={member.role}
                  onChange={(e) => handleRoleChange(member._id, e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>

                <button
                  className="action-btn remove"
                  onClick={() => handleRemoveMember(member._id)}
                  title="Remove member"
                >
                  <RiDeleteBin6Line />
                </button>

                <button
                  className="action-btn ban"
                  onClick={() => handleBanMember(member._id)}
                  title="Ban member"
                >
                  <RiUserUnfollowLine />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default UserInterface;
