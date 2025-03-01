import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiAddLine,
  RiCloseLine,
  RiCheckLine,
  RiImageAddLine,
  RiDeleteBinLine,
} from "react-icons/ri";
import "./LineUp.scss";
import AvatarUpload from "../AvatarUpload/AvatarUpload";
import { useToast } from "../Toast/ToastContext";

function LineUp({
  onClose,
  event,
  selectedBrand,
  onSave,
  initialSelectedLineups = [],
}) {
  const [lineUps, setLineUps] = useState([]);
  const [selectedLineUps, setSelectedLineUps] = useState(
    initialSelectedLineups
  );
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLineUp, setNewLineUp] = useState({
    name: "",
    category: "",
    avatar: null,
    avatarPreview: null,
  });
  const [isCropMode, setIsCropMode] = useState(false);
  const [modalKey, setModalKey] = useState(Date.now());
  const { showSuccess, showError, showLoading } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lineupToDelete, setLineupToDelete] = useState(null);

  // Extract eventId from event prop if available
  const eventId = event?._id;

  // Get token and brandId from localStorage at component mount
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [brandId, setBrandId] = useState(
    () => selectedBrand?._id || localStorage.getItem("selectedBrandId")
  );

  // Get user from localStorage for the userId
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error("Error parsing user data from localStorage:", e);
        return { userId: null };
      }
    }
    return { userId: null };
  });

  // Check for token and brandId on component mount and when they might change
  useEffect(() => {
    const currentToken = localStorage.getItem("token");
    const currentBrandId =
      selectedBrand?._id || localStorage.getItem("selectedBrandId");

    if (currentToken !== token) {
      setToken(currentToken);
    }

    if (currentBrandId !== brandId) {
      setBrandId(currentBrandId);
    }

    console.log("LineUp component initialized with:", {
      eventId,
      brandId: currentBrandId,
      hasToken: !!currentToken,
      selectedBrand: !!selectedBrand,
    });
  }, [selectedBrand]);

  useEffect(() => {
    fetchLineUps();
    if (eventId) {
      fetchEventLineUps();
    }
  }, [eventId, token, brandId, initialSelectedLineups]);

  // Initialize selectedLineUps with initialSelectedLineups if provided
  useEffect(() => {
    if (initialSelectedLineups && initialSelectedLineups.length > 0) {
      console.log(
        "Initializing with selected lineups:",
        initialSelectedLineups
      );
      setSelectedLineUps(initialSelectedLineups);
    }
  }, [initialSelectedLineups]);

  // Log when component mounts
  useEffect(() => {
    console.log("LineUp component mounted with:", {
      initialSelectedLineups,
      eventId,
      selectedBrand: selectedBrand?._id,
    });

    return () => {
      console.log("LineUp component unmounting");
    };
  }, []);

  // Log when selectedLineUps changes
  useEffect(() => {
    console.log("Selected lineups updated:", selectedLineUps);
  }, [selectedLineUps]);

  const fetchLineUps = async () => {
    try {
      setLoading(true);
      // Get fresh values from localStorage
      const currentToken = localStorage.getItem("token");
      const currentBrandId =
        selectedBrand?._id || localStorage.getItem("selectedBrandId");

      if (!currentToken || !currentBrandId) {
        console.log("Missing token or brandId", {
          token: !!currentToken,
          brandId: !!currentBrandId,
        });
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/lineup/brand/${currentBrandId}`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      setLineUps(response.data);
    } catch (error) {
      console.error("Error fetching lineups:", error);
      showError("Failed to fetch lineups");
    } finally {
      setLoading(false);
    }
  };

  const fetchEventLineUps = async () => {
    try {
      // Get fresh token from localStorage
      const currentToken = localStorage.getItem("token");

      if (!currentToken || !eventId) {
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/lineup/event/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      // Only set selectedLineUps if initialSelectedLineups was empty
      if (initialSelectedLineups.length === 0) {
        setSelectedLineUps(response.data);
      }
    } catch (error) {
      console.error("Error fetching event lineups:", error);
    }
  };

  const toggleLineUpSelection = (lineUp) => {
    console.log("Toggling lineup selection:", lineUp);
    setSelectedLineUps((prev) => {
      const isSelected = prev.some((item) => item._id === lineUp._id);
      console.log("Is already selected:", isSelected);
      if (isSelected) {
        return prev.filter((item) => item._id !== lineUp._id);
      } else {
        return [...prev, lineUp];
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewLineUp((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageCropped = (file) => {
    // Create a preview URL for the cropped image
    const previewUrl = URL.createObjectURL(file);

    setNewLineUp((prev) => ({
      ...prev,
      avatarFile: file,
      avatarPreview: previewUrl,
    }));

    console.log("Image cropped and preview created:", previewUrl);
  };

  const handleCreateLineUp = async () => {
    try {
      if (!newLineUp.name || !newLineUp.category) {
        showError("Please fill in all required fields");
        return;
      }

      // Get fresh values from localStorage
      const currentToken = localStorage.getItem("token");
      const currentBrandId =
        selectedBrand?._id || localStorage.getItem("selectedBrandId");

      console.log("Creating lineup with token and brandId:", {
        hasToken: !!currentToken,
        hasBrandId: !!currentBrandId,
        brandId: currentBrandId,
      });

      if (!currentToken || !currentBrandId) {
        console.error("Missing token or brandId");
        showError("Authentication required");
        return;
      }

      const loadingToastId = showLoading("Creating lineup...");
      setLoading(true);

      const formData = new FormData();
      formData.append("name", newLineUp.name);
      formData.append("category", newLineUp.category);
      formData.append("brandId", currentBrandId);

      if (newLineUp.avatarFile) {
        formData.append("avatar", newLineUp.avatarFile);
      }

      console.log("[LineUp] Sending create request:", {
        name: newLineUp.name,
        category: newLineUp.category,
        brandId: currentBrandId,
        hasAvatar: !!newLineUp.avatarFile,
      });

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/lineup`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("[LineUp] Create response:", response.data);

      const newLineUpData = response.data;
      setLineUps((prev) => [...prev, newLineUpData]);
      setSelectedLineUps((prev) => [...prev, newLineUpData]);
      setNewLineUp({
        name: "",
        category: "",
        avatar: null,
        avatarFile: null,
        avatarPreview: null,
      });
      setIsAddingNew(false);
      showSuccess("Lineup created successfully");
    } catch (error) {
      console.error("Error creating lineup:", error);
      showError(
        "Failed to create lineup: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e, lineup) => {
    e.stopPropagation(); // Prevent toggling selection
    setLineupToDelete(lineup);
    setShowDeleteConfirm(true);
  };

  const handleDeleteLineUp = async () => {
    if (!lineupToDelete) return;

    try {
      console.log("[handleDeleteLineUp] Starting deletion for lineup:", {
        id: lineupToDelete._id,
        name: lineupToDelete.name,
      });

      const currentToken = localStorage.getItem("token");

      if (!currentToken) {
        console.error("[handleDeleteLineUp] No token found in localStorage");
        showError("Authentication required");
        return;
      }

      setLoading(true);
      const loadingToast = showLoading("Deleting lineup...");

      console.log(
        `[handleDeleteLineUp] Sending DELETE request to ${process.env.REACT_APP_API_BASE_URL}/lineup/${lineupToDelete._id}`
      );

      const response = await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/lineup/${lineupToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      console.log("[handleDeleteLineUp] Response received:", response.data);

      if (response.data.success) {
        console.log("[handleDeleteLineUp] Delete successful, updating state");

        // Remove from lineUps list
        setLineUps((prev) =>
          prev.filter((item) => item._id !== lineupToDelete._id)
        );

        // Remove from selectedLineUps if present
        setSelectedLineUps((prev) =>
          prev.filter((item) => item._id !== lineupToDelete._id)
        );

        showSuccess("Lineup deleted successfully");
      } else {
        console.error(
          "[handleDeleteLineUp] Server returned success: false",
          response.data
        );
        showError(response.data.message || "Failed to delete lineup");
      }
    } catch (error) {
      console.error("Error deleting lineup:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage = error.response?.data?.message || error.message;
      showError(`Failed to delete lineup: ${errorMessage}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setLineupToDelete(null);
    }
  };

  const handleSave = async () => {
    try {
      // Instead of making an API call, just pass the selected lineups back to the parent
      if (onSave) {
        onSave(selectedLineUps);
        showSuccess("Lineups selected successfully");
      }
      onClose();
    } catch (error) {
      console.error("Error handling lineups:", error);
      showError("Failed to handle lineups");
    }
  };

  // Handle opening the avatar crop mode
  const handleOpenAvatarCrop = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    console.log("Opening avatar crop mode");
    setIsCropMode(true);
    setShowModal(true); // Make sure the modal is shown
  };

  // Create a dummy user object with just the userId for AvatarUpload
  const dummyUser = { _id: user?.userId || "temp-id" };

  // Function to handle modal closing
  const handleModalClose = (e) => {
    if (e) e.stopPropagation();
    setIsCropMode(false);
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (newLineUp.avatarPreview) {
        URL.revokeObjectURL(newLineUp.avatarPreview);
      }
    };
  }, [newLineUp.avatarPreview]);

  return (
    <AnimatePresence key={`lineup-modal-${modalKey}`}>
      <motion.div
        className="lineup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="lineup-modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          <button className="close-button" onClick={onClose}>
            <RiCloseLine />
          </button>

          {/* Render the AvatarUpload modal outside the main modal to prevent event conflicts */}
          {isCropMode && (
            <div
              className="crop-modal-wrapper"
              onClick={handleModalClose}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 2000,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
              }}
            />
          )}

          <h2>LINE UP</h2>

          <div className="lineup-content">
            {/* Add new lineup form - moved to the top */}
            {isAddingNew && (
              <div className="compact-add-form">
                <div className="form-grid">
                  <div className="avatar-cell" onClick={handleOpenAvatarCrop}>
                    {newLineUp.avatarPreview ? (
                      <div className="avatar-preview">
                        <img
                          src={newLineUp.avatarPreview}
                          alt="Avatar preview"
                          className="preview-image"
                        />
                      </div>
                    ) : (
                      <AvatarUpload
                        user={dummyUser}
                        setUser={setUser}
                        isCropMode={isCropMode}
                        setIsCropMode={setIsCropMode}
                        onImageCropped={handleImageCropped}
                        isLineUpMode={true}
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    name="category"
                    value={newLineUp.category}
                    onChange={handleInputChange}
                    placeholder="Cat"
                    className="category-cell"
                  />
                  <input
                    type="text"
                    name="name"
                    value={newLineUp.name}
                    onChange={handleInputChange}
                    placeholder="Name"
                    className="name-cell"
                  />
                  <button
                    className={`check-cell ${
                      newLineUp.name && newLineUp.category ? "active" : ""
                    }`}
                    onClick={handleCreateLineUp}
                    disabled={!newLineUp.name || !newLineUp.category}
                  >
                    <RiCheckLine />
                  </button>
                </div>
              </div>
            )}

            <div className="lineup-section">
              {loading ? (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                <div className="lineup-grid">
                  {lineUps.map((lineUp) => (
                    <div
                      key={lineUp._id}
                      className={`lineup-item ${
                        selectedLineUps.some((item) => item._id === lineUp._id)
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => toggleLineUpSelection(lineUp)}
                    >
                      <div className="lineup-avatar">
                        {lineUp.avatar ? (
                          <img
                            src={
                              typeof lineUp.avatar === "string"
                                ? lineUp.avatar
                                : lineUp.avatar.medium ||
                                  lineUp.avatar.thumbnail
                            }
                            alt={lineUp.name}
                          />
                        ) : (
                          <div className="avatar-placeholder"></div>
                        )}
                      </div>
                      <div className="lineup-info">
                        <span className="lineup-category">
                          {lineUp.category}
                        </span>
                        <span className="lineup-name">{lineUp.name}</span>
                      </div>
                      {selectedLineUps.some(
                        (item) => item._id === lineUp._id
                      ) && (
                        <div className="selected-indicator">
                          <RiCheckLine />
                        </div>
                      )}
                      <div
                        className="delete-icon"
                        onClick={(e) => handleDeleteClick(e, lineUp)}
                        title="Delete lineup"
                      >
                        <RiDeleteBinLine />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new button moved to the bottom */}
              <div
                className="add-new-button"
                onClick={() => setIsAddingNew(true)}
              >
                <div className="add-icon">
                  <RiAddLine />
                </div>
                <span>Add New</span>
              </div>
            </div>
          </div>

          <div className="lineup-actions">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && lineupToDelete && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation">
            <h3>Delete Lineup</h3>
            <p>
              Are you sure you want to delete {lineupToDelete.name}? This action
              cannot be undone.
            </p>
            <div className="confirmation-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setLineupToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-delete-btn"
                onClick={handleDeleteLineUp}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LineUp;
