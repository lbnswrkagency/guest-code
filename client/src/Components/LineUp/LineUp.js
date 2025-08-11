import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiAddLine,
  RiCloseLine,
  RiCheckLine,
  RiImageAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiDeleteBin2Line,
} from "react-icons/ri";
import "./LineUp.scss";
import AvatarUpload from "../AvatarUpload/AvatarUpload";
import { useToast } from "../Toast/ToastContext";
import { createPortal } from "react-dom";

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
  const [isEditing, setIsEditing] = useState(false);
  const [lineupToEdit, setLineupToEdit] = useState(null);
  const [newLineUp, setNewLineUp] = useState({
    name: "",
    category: "",
    subtitle: "",
    avatar: null,
    avatarPreview: null,
  });
  const [isCropMode, setIsCropMode] = useState(false);
  const [modalKey, setModalKey] = useState(Date.now());
  const { showSuccess, showError, showLoading } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lineupToDelete, setLineupToDelete] = useState(null);
  const [showCategoryDeleteConfirm, setShowCategoryDeleteConfirm] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showSubtitleDeleteConfirm, setShowSubtitleDeleteConfirm] =
    useState(false);
  const [subtitleToDelete, setSubtitleToDelete] = useState(null);

  // Extract unique categories from existing lineups
  const [existingCategories, setExistingCategories] = useState([]);

  // Extract unique subtitles from existing lineups
  const [existingSubtitles, setExistingSubtitles] = useState([]);

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
  }, [selectedBrand]);

  useEffect(() => {
    fetchLineUps();
    if (eventId) {
      fetchEventLineUps();
    }
  }, [eventId, token, brandId, initialSelectedLineups]);

  // Extract unique categories and subtitles from lineups
  useEffect(() => {
    if (lineUps.length > 0) {
      const uniqueCategories = [
        ...new Set(lineUps.filter((lineup) => lineup && lineup.category).map((lineup) => lineup.category)),
      ].filter(Boolean);
      setExistingCategories(uniqueCategories);

      const uniqueSubtitles = [
        ...new Set(lineUps.filter((lineup) => lineup && lineup.subtitle).map((lineup) => lineup.subtitle)),
      ].filter(Boolean);
      setExistingSubtitles(uniqueSubtitles);
    }
  }, [lineUps]);

  // Initialize selectedLineUps with initialSelectedLineups if provided
  useEffect(() => {
    if (initialSelectedLineups && initialSelectedLineups.length > 0) {
      setSelectedLineUps(initialSelectedLineups);
    }
  }, [initialSelectedLineups]);

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
    setSelectedLineUps((prev) => {
      const isSelected = prev.some((item) => item._id === lineUp._id);
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
      formData.append("subtitle", newLineUp.subtitle || "");
      formData.append("brandId", currentBrandId);

      if (newLineUp.avatarFile) {
        formData.append("avatar", newLineUp.avatarFile);
      }

      console.log("[LineUp] Sending create request:", {
        name: newLineUp.name,
        category: newLineUp.category,
        subtitle: newLineUp.subtitle,
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

      const newLineUpData = response.data;
      setLineUps((prev) => [...prev, newLineUpData]);
      setSelectedLineUps((prev) => [...prev, newLineUpData]);
      setNewLineUp({
        name: "",
        category: "",
        subtitle: "",
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

  const handleEditClick = (e, lineup) => {
    e.stopPropagation(); // Prevent toggling selection
    setLineupToEdit(lineup);
    setNewLineUp({
      name: lineup.name,
      category: lineup.category,
      subtitle: lineup.subtitle || "",
      avatar: lineup.avatar,
      avatarPreview: lineup.avatar
        ? typeof lineup.avatar === "string"
          ? lineup.avatar
          : lineup.avatar.medium || lineup.avatar.thumbnail
        : null,
    });
    setIsEditing(true);
    setIsAddingNew(true);
  };

  const handleUpdateLineUp = async () => {
    try {
      if (!newLineUp.name || !newLineUp.category) {
        showError("Please fill in all required fields");
        return;
      }

      // Get fresh values from localStorage
      const currentToken = localStorage.getItem("token");

      if (!currentToken || !lineupToEdit._id) {
        console.error("Missing token or lineup ID");
        showError("Authentication required");
        return;
      }

      const loadingToastId = showLoading("Updating lineup...");
      setLoading(true);

      const formData = new FormData();
      formData.append("name", newLineUp.name);
      formData.append("category", newLineUp.category);
      formData.append("subtitle", newLineUp.subtitle || "");

      if (newLineUp.avatarFile) {
        formData.append("avatar", newLineUp.avatarFile);
      }

      console.log("[LineUp] Sending update request:", {
        id: lineupToEdit._id,
        name: newLineUp.name,
        category: newLineUp.category,
        subtitle: newLineUp.subtitle,
        hasAvatar: !!newLineUp.avatarFile,
      });

      const response = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/lineup/${lineupToEdit._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const updatedLineUp = response.data.lineUp;

      // Update the lineUps state with the updated lineup
      setLineUps((prev) =>
        prev.map((item) =>
          item._id === updatedLineUp._id ? updatedLineUp : item
        )
      );

      // Also update in selectedLineUps if it's there
      setSelectedLineUps((prev) =>
        prev.map((item) =>
          item._id === updatedLineUp._id ? updatedLineUp : item
        )
      );

      // Reset form state
      setNewLineUp({
        name: "",
        category: "",
        subtitle: "",
        avatar: null,
        avatarFile: null,
        avatarPreview: null,
      });

      setIsEditing(false);
      setIsAddingNew(false);
      setLineupToEdit(null);

      showSuccess("Lineup updated successfully");
    } catch (error) {
      console.error("Error updating lineup:", error);
      showError(
        "Failed to update lineup: " +
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
      const currentToken = localStorage.getItem("token");

      if (!currentToken) {
        console.error("[handleDeleteLineUp] No token found in localStorage");
        showError("Authentication required");
        return;
      }

      setLoading(true);
      const loadingToast = showLoading("Deleting lineup...");

      const response = await axios({
        method: "DELETE",
        url: `${process.env.REACT_APP_API_BASE_URL}/lineup/${lineupToDelete._id}`,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
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

  // Handle subtitle quick selection
  const handleSubtitleSelect = (subtitle) => {
    setNewLineUp((prev) => ({
      ...prev,
      subtitle,
    }));
  };

  // Handle opening the avatar crop mode
  const handleOpenAvatarCrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Handle canceling form
  const handleCancelForm = () => {
    setIsAddingNew(false);
    setIsEditing(false);
    setLineupToEdit(null);
    setNewLineUp({
      name: "",
      category: "",
      subtitle: "",
      avatar: null,
      avatarPreview: null,
    });
  };

  // Function to handle deleting a category
  const handleCategoryDeleteClick = (e, category) => {
    e.stopPropagation(); // Prevent category selection
    setCategoryToDelete(category);
    setShowCategoryDeleteConfirm(true);
  };

  // Function to handle deleting a subtitle
  const handleSubtitleDeleteClick = (e, subtitle) => {
    e.stopPropagation(); // Prevent subtitle selection
    setSubtitleToDelete(subtitle);
    setShowSubtitleDeleteConfirm(true);
  };

  // Function to delete a category from the backend
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const currentToken = localStorage.getItem("token");
      const currentBrandId =
        selectedBrand?._id || localStorage.getItem("selectedBrandId");

      if (!currentToken || !currentBrandId) {
        console.error("Missing token or brandId");
        showError("Authentication required");
        return;
      }

      setLoading(true);
      const loadingToast = showLoading("Deleting category...");

      const response = await axios({
        method: "DELETE",
        url: `${process.env.REACT_APP_API_BASE_URL}/lineup/category/${currentBrandId}/${categoryToDelete}`,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        // Fetch lineups again to get updated data
        await fetchLineUps();
        showSuccess(`Category "${categoryToDelete}" deleted`);
      } else {
        console.error(
          "[handleDeleteCategory] Server returned success: false",
          response.data
        );
        showError(response.data.message || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      const errorMessage = error.response?.data?.message || error.message;
      showError(`Failed to delete category: ${errorMessage}`);
    } finally {
      setLoading(false);
      setShowCategoryDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  };

  // Function to delete a subtitle from the backend
  const handleDeleteSubtitle = async () => {
    if (!subtitleToDelete) return;

    try {
      const currentToken = localStorage.getItem("token");
      const currentBrandId =
        selectedBrand?._id || localStorage.getItem("selectedBrandId");

      if (!currentToken || !currentBrandId) {
        console.error("Missing token or brandId");
        showError("Authentication required");
        return;
      }

      setLoading(true);
      const loadingToast = showLoading("Deleting subtitle...");

      const response = await axios({
        method: "DELETE",
        url: `${process.env.REACT_APP_API_BASE_URL}/lineup/subtitle/${currentBrandId}/${subtitleToDelete}`,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        // Fetch lineups again to get updated data
        await fetchLineUps();
        showSuccess(`Subtitle "${subtitleToDelete}" deleted`);
      } else {
        console.error(
          "[handleDeleteSubtitle] Server returned success: false",
          response.data
        );
        showError(response.data.message || "Failed to delete subtitle");
      }
    } catch (error) {
      console.error("Error deleting subtitle:", error);
      const errorMessage = error.response?.data?.message || error.message;
      showError(`Failed to delete subtitle: ${errorMessage}`);
    } finally {
      setLoading(false);
      setShowSubtitleDeleteConfirm(false);
      setSubtitleToDelete(null);
    }
  };

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

          {/* Render the AvatarUpload modal directly using createPortal to avoid nesting issues */}
          {isCropMode &&
            createPortal(
              <div
                className="crop-modal-wrapper"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCropMode(false);
                }}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 2500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0, 0, 0, 0.8)",
                  backdropFilter: "blur(5px)",
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{
                    position: "relative",
                    width: "90%",
                    maxWidth: "600px",
                    pointerEvents: "auto",
                    zIndex: 3000,
                  }}
                >
                  <AvatarUpload
                    user={dummyUser}
                    setUser={(updatedUser) => {
                      // Don't actually update any user, just for UI display
                    }}
                    isCropMode={true}
                    setIsCropMode={(value) => {
                      setIsCropMode(value);
                    }}
                    onImageCropped={(file) => {
                      handleImageCropped(file);
                    }}
                    isLineUpMode={true}
                  />
                </div>
              </div>,
              document.body
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
                  {lineUps.filter((lineUp) => lineUp && lineUp._id).map((lineUp) => (
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
                        {lineUp.subtitle && (
                          <span className="lineup-subtitle">
                            {lineUp.subtitle}
                          </span>
                        )}
                      </div>
                      {selectedLineUps.some(
                        (item) => item._id === lineUp._id
                      ) && (
                        <div className="selected-indicator">
                          <RiCheckLine />
                        </div>
                      )}
                      <div
                        className="edit-icon always-visible"
                        onClick={(e) => handleEditClick(e, lineUp)}
                        title="Edit lineup"
                      >
                        <RiEditLine />
                      </div>
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

          {/* Add/Edit lineup form - shown as a popup, moved outside lineup-content */}
          {isAddingNew && (
            <div className="delete-confirmation-overlay">
              <div className="add-form-popup">
                <div className="add-form-header">
                  <h3>{isEditing ? "Edit Lineup" : "Add New Lineup"}</h3>
                  <button
                    className="close-form-button"
                    onClick={handleCancelForm}
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
                        {isCropMode && (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(0,0,0,0.5)",
                              borderRadius: "50%",
                            }}
                          >
                            <div className="loading-spinner"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="quick-categories">
                    <h4>Categories</h4>
                    <div className="category-chips">
                      {existingCategories.length > 0 ? (
                        existingCategories.map((category) => (
                          <div
                            key={category}
                            className={`category-chip ${
                              newLineUp.category === category ? "active" : ""
                            }`}
                          >
                            <div
                              className="chip-content"
                              onClick={() => handleCategorySelect(category)}
                            >
                              {category}
                            </div>
                            {newLineUp.category === category && (
                              <div
                                className="chip-delete"
                                onClick={(e) =>
                                  handleCategoryDeleteClick(e, category)
                                }
                                title="Delete category"
                              >
                                <RiDeleteBin2Line />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="no-categories">
                          No existing categories
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="quick-categories">
                    <h4>Subtitles</h4>
                    <div className="category-chips">
                      {existingSubtitles.length > 0 ? (
                        existingSubtitles.map((subtitle) => (
                          <div
                            key={subtitle}
                            className={`category-chip ${
                              newLineUp.subtitle === subtitle ? "active" : ""
                            }`}
                          >
                            <div
                              className="chip-content"
                              onClick={() => handleSubtitleSelect(subtitle)}
                            >
                              {subtitle}
                            </div>
                            {newLineUp.subtitle === subtitle && (
                              <div
                                className="chip-delete"
                                onClick={(e) =>
                                  handleSubtitleDeleteClick(e, subtitle)
                                }
                                title="Delete subtitle"
                              >
                                <RiDeleteBin2Line />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="no-categories">
                          No existing subtitles
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
                    <div className="form-group">
                      <label htmlFor="subtitle">Subtitle</label>
                      <input
                        type="text"
                        id="subtitle"
                        name="subtitle"
                        value={newLineUp.subtitle}
                        onChange={handleInputChange}
                        placeholder="e.g., Berlin, New York, Special Guest"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      className="cancel-form-button"
                      onClick={handleCancelForm}
                    >
                      Cancel
                    </button>
                    <button
                      className={`save-form-button ${
                        newLineUp.name && newLineUp.category ? "active" : ""
                      }`}
                      onClick={
                        isEditing ? handleUpdateLineUp : handleCreateLineUp
                      }
                      disabled={!newLineUp.name || !newLineUp.category}
                    >
                      {isEditing ? "Update" : "Save"}
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

      {/* Category Delete Confirmation Dialog */}
      {showCategoryDeleteConfirm && categoryToDelete && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation">
            <h3>Delete Category</h3>
            <p>
              Are you sure you want to delete the category "{categoryToDelete}"?
              All lineups using this category will be changed to "Other".
            </p>
            <div className="delete-actions">
              <button
                className="cancel-delete"
                onClick={() => {
                  setShowCategoryDeleteConfirm(false);
                  setCategoryToDelete(null);
                }}
              >
                Cancel
              </button>
              <button className="confirm-delete" onClick={handleDeleteCategory}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtitle Delete Confirmation Dialog */}
      {showSubtitleDeleteConfirm && subtitleToDelete && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation">
            <h3>Delete Subtitle</h3>
            <p>
              Are you sure you want to delete the subtitle "{subtitleToDelete}"?
              All lineups using this subtitle will have their subtitle cleared.
            </p>
            <div className="delete-actions">
              <button
                className="cancel-delete"
                onClick={() => {
                  setShowSubtitleDeleteConfirm(false);
                  setSubtitleToDelete(null);
                }}
              >
                Cancel
              </button>
              <button className="confirm-delete" onClick={handleDeleteSubtitle}>
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
