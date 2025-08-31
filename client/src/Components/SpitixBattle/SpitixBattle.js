import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosConfig";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiRefreshLine,
  RiSwordLine,
} from "react-icons/ri";
import Navigation from "../Navigation/Navigation";
import ActionButtons from "../ActionButtons/ActionButtons";
import { useToast } from "../Toast/ToastContext";
import "./SpitixBattle.scss";

function SpitixBattle({ user, onClose, eventId, eventTitle, permissions = {} }) {
  const [battleSignups, setBattleSignups] = useState([]);
  const [battleStats, setBattleStats] = useState({});
  const [battleConfig, setBattleConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [deleteModalSignup, setDeleteModalSignup] = useState(null);
  const { showSuccess, showError, showLoading } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchBattleData();
    } else {
      setError("No event ID provided");
      setLoading(false);
    }
  }, [eventId]);

  const fetchBattleData = async () => {
    try {
      setLoading(true);
      
      // Fetch both battle signups and stats in parallel
      const [signupsResponse, statsResponse] = await Promise.all([
        axiosInstance.get(`/battleSign/fetch?eventId=${eventId}`),
        axiosInstance.get(`/battleSign/stats/${eventId}`)
      ]);
      
      setBattleSignups(signupsResponse.data);
      setBattleStats(statsResponse.data.stats);
      setBattleConfig(statsResponse.data.event.battleConfig);
      setLoading(false);
    } catch (err) {
      setError("Error fetching battle data: " + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  const confirmRoute = (id) =>
    `${process.env.REACT_APP_API_BASE_URL}/battleSign/confirm/${id}`;
  const declineRoute = (id) =>
    `${process.env.REACT_APP_API_BASE_URL}/battleSign/decline/${id}`;
  const resetRoute = (id) =>
    `${process.env.REACT_APP_API_BASE_URL}/battleSign/reset/${id}`;


  const getCategoryCount = (categoryName) => {
    return battleStats[categoryName]?.total || 0;
  };

  const getConfirmedCount = (categoryName) => {
    return battleStats[categoryName]?.confirmed || 0;
  };

  const getMaxParticipants = (categoryName) => {
    return battleStats[categoryName]?.maxParticipants || battleConfig?.maxParticipantsPerCategory || 16;
  };

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const handleConfirm = async (updatedSignup) => {
    // Check permissions first
    if (!permissions.battles?.edit) {
      showError("You don't have permission to approve battle signups");
      return;
    }

    // Check participant limits for each category the signup is for
    for (const category of updatedSignup.categories) {
      const maxParticipants = getMaxParticipants(category);
      const confirmedCount = getConfirmedCount(category);

      if (confirmedCount >= maxParticipants) {
        showError(
          `Maximum limit reached for ${category}. Cannot confirm more.`
        );
        return;
      }
    }

    const loadingToast = showLoading("Approving battle signup...");

    try {
      // Call the API to confirm the battle signup
      const response = await axiosInstance.post(
        `/battleSign/battle/${updatedSignup._id}/confirm`
      );
      
      loadingToast.dismiss();
      showSuccess("Battle signup approved successfully!");
      fetchBattleData(); // Refresh data
    } catch (error) {
      loadingToast.dismiss();
      showError("Failed to approve battle signup");
      console.error("Error approving battle signup:", error);
    }
  };

  const handleDecline = async (updatedSignup) => {
    // Check permissions first
    if (!permissions.battles?.edit) {
      showError("You don't have permission to decline battle signups");
      return;
    }

    const loadingToast = showLoading("Declining battle signup...");

    try {
      // Call the API to decline the battle signup
      const response = await axiosInstance.post(
        `/battleSign/battle/${updatedSignup._id}/decline`
      );
      
      loadingToast.dismiss();
      showSuccess("Battle signup declined");
      fetchBattleData(); // Refresh data
    } catch (error) {
      loadingToast.dismiss();
      showError("Failed to decline battle signup");
      console.error("Error declining battle signup:", error);
    }
  };

  const handleReset = async (updatedSignup) => {
    // Check permissions first
    if (!permissions.battles?.edit) {
      showError("You don't have permission to reset battle signups");
      return;
    }

    try {
      // Update signup status to pending locally
      const resetSignup = { ...updatedSignup, status: "pending" };
      setBattleSignups(prev => 
        prev.map(s => s._id === updatedSignup._id ? resetSignup : s)
      );
      
      showSuccess("Battle signup reset to pending");
      fetchBattleData(); // Refresh data
    } catch (error) {
      showError("Failed to reset battle signup");
      console.error("Error resetting battle signup:", error);
    }
  };

  const handleDelete = async (signup) => {
    // Check permissions first
    if (!permissions.battles?.delete) {
      showError("You don't have permission to delete battle signups");
      return;
    }

    setDeleteModalSignup(signup);
  };

  const confirmDelete = async () => {
    if (!deleteModalSignup) return;

    const loadingToast = showLoading("Deleting battle signup...");

    try {
      const response = await axiosInstance.delete(
        `/battleSign/battle/${deleteModalSignup._id}`
      );
      
      loadingToast.dismiss();
      showSuccess("Battle signup deleted successfully");
      setDeleteModalSignup(null);
      fetchBattleData(); // Refresh data
    } catch (error) {
      loadingToast.dismiss();
      showError("Failed to delete battle signup");
      console.error("Error deleting battle signup:", error);
    }
  };

  const cancelDelete = () => {
    setDeleteModalSignup(null);
  };

  // All state handling is now done in the return statement

  return (
    <motion.div
      className="spitixBattle"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <Navigation onBack={onClose} />
      
      <div className="spitixBattle-header">
        <h2>
          <RiSwordLine /> Battle Management
          {eventTitle && (
            <span className="event-name"> - {eventTitle}</span>
          )}
        </h2>
        <div className="header-actions">
          <button
            className="refresh-btn"
            onClick={fetchBattleData}
            disabled={loading}
          >
            <RiRefreshLine className={loading ? "spinning" : ""} />
          </button>
          <button className="close-btn" onClick={onClose}>
            <RiCloseLine />
          </button>
        </div>
      </div>

      <div className="spitixBattle-content">
        {loading ? (
          <div className="loading-state">
            <div className="loader"></div>
            <p>Loading battle data...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
          </div>
        ) : !battleConfig || !battleConfig.categories || battleConfig.categories.length === 0 ? (
          <div className="empty-state">
            <h3>No Battle Categories Available</h3>
            <p>This event does not have any battle categories configured.</p>
          </div>
        ) : (
          <div className="spitixBattle-container">
          {battleConfig.categories.map((category) => (
            <div key={category.name} className="spitixBattle-category">
              <h2 className="spitixBattle-category-title">
                {category.displayName || category.name}
                <span className="spitixBattle-category-count">
                  {getConfirmedCount(category.name)}/{getMaxParticipants(category.name)}
                </span>
              </h2>
              <div
                className="spitixBattle-category-total"
                onClick={() => toggleCategory(category.name)}
              >
                Total {getCategoryCount(category.name)}
                <img
                  src="/image/arrow-up.svg"
                  alt=""
                  className={`spitixBattle-category-arrow ${
                    expandedCategory === category.name ? "rotated" : ""
                  }`}
                />
              </div>
              {expandedCategory === category.name && (
                <div className="spitixBattle-category-details">
                  {battleSignups
                    .filter((signup) => signup.categories.includes(category.name))
                    .map((signup, index) => (
                      <div key={index} className="spitixBattle-signup">
                        <p className="spitixBattle-signup-name">
                          {signup.name}
                        </p>
                        <p className="spitixBattle-signup-contact">
                          <strong>Contact:</strong> {signup.phone} | {signup.email}
                        </p>
                        {signup.instagram && (
                          <p className="spitixBattle-signup-instagram">
                            <strong>Instagram:</strong> @{signup.instagram.replace('@', '')}
                          </p>
                        )}
                        {signup.participants && signup.participants.length > 0 && (
                          <div className="spitixBattle-signup-participants">
                            <strong>Team Members:</strong>
                            <ul>
                              {signup.participants.map((participant, idx) => (
                                <li key={idx}>
                                  {participant.name}
                                  {participant.instagram && (
                                    <span> (@{participant.instagram.replace('@', '')})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {signup.message && (
                          <p className="spitixBattle-signup-message">
                            {signup.message}
                          </p>
                        )}
                        <p className="spitixBattle-signup-status">
                          <strong>Status:</strong>
                          <span className={`status-badge ${signup.status || 'pending'}`}>
                            {signup.status || "pending"}
                          </span>
                        </p>
                        {/* Categories are shown in the section header, so we can remove this redundant line */}
                        {/* Show action buttons based on status and permissions */}
                        {permissions.battles?.edit && (
                          <div className="battle-action-buttons">
                            {/* Show approve button only if not already confirmed */}
                            {signup.status !== 'confirmed' && (
                              <button
                                className="action-btn approve-btn"
                                onClick={() => handleConfirm(signup)}
                              >
                                Approve
                              </button>
                            )}
                            
                            {/* Show decline button only if not already declined */}
                            {signup.status !== 'declined' && (
                              <button
                                className="action-btn decline-btn"
                                onClick={() => handleDecline(signup)}
                              >
                                Decline
                              </button>
                            )}
                            
                            {/* Always show reset button if status is not pending */}
                            {signup.status && signup.status !== 'pending' && (
                              <button
                                className="action-btn reset-btn"
                                onClick={() => handleReset(signup)}
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Show delete button if user has delete permissions */}
                        {permissions.battles?.delete && (
                          <button
                            onClick={() => handleDelete(signup)}
                            className="spitixBattle-delete-button"
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginTop: '10px'
                            }}
                          >
                            Delete Signup
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteModalSignup && (
        <div className="spitixBattle-delete-modal">
          <div className="modal-content">
            <h3>Delete Battle Signup</h3>
            <p>
              Are you sure you want to delete the battle signup for{" "}
              <strong>{deleteModalSignup.name}</strong>?
            </p>
            <p className="warning-text">
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default SpitixBattle;
