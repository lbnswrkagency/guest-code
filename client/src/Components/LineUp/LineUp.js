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

  // Extract unique categories from existing lineups
  const [existingCategories, setExistingCategories] = useState([]);

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

  // Extract unique categories from lineups
  useEffect(() => {
    if (lineUps.length > 0) {
      const uniqueCategories = [
        ...new Set(lineUps.map((lineup) => lineup.category)),
      ].filter(Boolean);
      setExistingCategories(uniqueCategories);
    }
  }, [lineUps]);

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
    console.log("[handleImageCropped] Image cropped, updating state");

    // Create a preview URL for the cropped image
    const previewUrl = URL.createObjectURL(file);

    // Update the newLineUp state with the cropped image
    setNewLineUp((prev) => ({
      ...prev,
      avatarFile: file, // Store the file for upload
      avatar: file, // Keep for compatibility
      avatarPreview: previewUrl,
    }));

    // Close the crop mode
    setIsCropMode(false);
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

      const response = await axios({
        method: "DELETE",
        url: `${process.env.REACT_APP_API_BASE_URL}/lineup/${lineupToDelete._id}`,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

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

  // Handle category quick selection
  const handleCategorySelect = (category) => {
    setNewLineUp((prev) => ({
      ...prev,
      category,
    }));
  };

  // Handle opening the avatar crop mode
  const handleOpenAvatarCrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[handleOpenAvatarCrop] Opening avatar crop mode");
    setIsCropMode(true);
    setModalKey(Date.now()); // Force re-render of the modal
  };

  // Create a dummy user object for AvatarUpload component
  const dummyUser = {
    _id: "lineup-avatar-" + Date.now(), // Ensure unique ID
    avatar: newLineUp.avatarPreview,
  };

  // Function to handle modal closing
  const handleModalClose = (e) => {
    if (e) e.stopPropagation();
    console.log("[handleModalClose] Closing avatar crop mode");
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
              className="delete-confirmation-overlay"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCropMode(false);
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "relative",
                  width: "auto", // Allow content to determine width
                  maxWidth: "90%", // Limit maximum width
                  pointerEvents: "auto", // Ensure clicks are registered
                }}
              >
                <AvatarUpload
                  user={dummyUser}
                  setUser={setUser}
                  isCropMode={isCropMode}
                  setIsCropMode={setIsCropMode}
                  onImageCropped={handleImageCropped}
                  isLineUpMode={true}
                />
              </div>
            </div>
          )}

          <h2>LINE UP</h2>

          <div className="lineup-content">
            {/* Add new lineup button */}
            {!isAddingNew && (
              <div
                className="add-new-button"
                onClick={() => setIsAddingNew(true)}
              >
                <div className="add-icon">
                  <RiAddLine />
                </div>
                <span>Add New</span>
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
                        className="delete-icon always-visible"
                        onClick={(e) => handleDeleteClick(e, lineUp)}
                        title="Delete lineup"
                      >
                        <RiDeleteBinLine />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add new lineup form - shown as a popup, moved outside lineup-content */}
          {isAddingNew && (
            <div className="delete-confirmation-overlay">
              <div className="add-form-popup">
                <div className="add-form-header">
                  <h3>Add New Lineup</h3>
                  <button
                    className="close-form-button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewLineUp({
                        name: "",
                        category: "",
                        avatar: null,
                        avatarPreview: null,
                      });
                    }}
                  >
                    <RiCloseLine />
                  </button>
                </div>
                <div className="add-form-content">
                  <div
                    className="avatar-upload-container"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Avatar upload container clicked");
                      setIsCropMode(true);
                      setModalKey(Date.now());
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      position: "relative",
                      zIndex: 100,
                      cursor: "pointer",
                      pointerEvents: "auto",
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCropMode(true);
                        setModalKey(Date.now());
                      }
                    }}
                  >
                    {newLineUp.avatarPreview ? (
                      <div className="avatar-preview">
                        <img
                          src={newLineUp.avatarPreview}
                          alt="Avatar preview"
                          className="preview-image"
                        />
                      </div>
                    ) : (
                      <div className="avatar-upload-placeholder">
                        <RiImageAddLine />
                        <span>Upload Image</span>
                      </div>
                    )}
                  </div>
                  <div className="quick-categories">
                    <div className="category-chips">
                      {existingCategories.length > 0 ? (
                        existingCategories.map((category) => (
                          <div
                            key={category}
                            className={`category-chip ${
                              newLineUp.category === category ? "active" : ""
                            }`}
                            onClick={() => handleCategorySelect(category)}
                          >
                            {category}
                          </div>
                        ))
                      ) : (
                        <div className="no-categories">
                          No existing categories
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-fields">
                    <div className="form-group">
                      <label htmlFor="category">Category</label>
                      <input
                        type="text"
                        id="category"
                        name="category"
                        value={newLineUp.category}
                        onChange={handleInputChange}
                        placeholder="e.g., DJ, Artist, Host"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="name">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={newLineUp.name}
                        onChange={handleInputChange}
                        placeholder="Enter name"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      className="cancel-form-button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewLineUp({
                          name: "",
                          category: "",
                          avatar: null,
                          avatarPreview: null,
                        });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className={`save-form-button ${
                        newLineUp.name && newLineUp.category ? "active" : ""
                      }`}
                      onClick={handleCreateLineUp}
                      disabled={!newLineUp.name || !newLineUp.category}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
            <div className="delete-actions">
              <button
                className="cancel-delete"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setLineupToDelete(null);
                }}
              >
                Cancel
              </button>
              <button className="confirm-delete" onClick={handleDeleteLineUp}>
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
