import React, { useState, useEffect, useMemo } from "react";
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
  RiMusicLine,
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

  // Consolidated delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    type: null, // 'lineup' | 'category' | 'subtitle'
    item: null,
  });

  // Extract unique categories from existing lineups
  const [existingCategories, setExistingCategories] = useState([]);

  // Extract unique subtitles from existing lineups
  const [existingSubtitles, setExistingSubtitles] = useState([]);

  // Extract eventId from event prop if available
  const eventId = event?._id;

  // Get token and brandId from localStorage at component mount
  const [token, setToken] = useState(null);
  const [brandId, setBrandId] = useState(null);

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

  // Group lineups by category
  const groupedLineups = useMemo(() => {
    const groups = {};
    lineUps.filter((lineup) => lineup && lineup._id).forEach((lineup) => {
      const category = lineup.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(lineup);
    });
    return groups;
  }, [lineUps]);

  // Check for token and brandId on component mount and when they might change
  useEffect(() => {
    const currentToken = localStorage.getItem("token");
    const currentBrandId =
      selectedBrand?._id || localStorage.getItem("selectedBrandId");

    setToken(currentToken);
    setBrandId(currentBrandId);
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
      const currentToken = localStorage.getItem("token");
      const currentBrandId =
        selectedBrand?._id || localStorage.getItem("selectedBrandId");

      if (!currentToken || !currentBrandId) {
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
    const previewUrl = URL.createObjectURL(file);

    setNewLineUp((prev) => ({
      ...prev,
      avatarFile: file,
      avatar: file,
      avatarPreview: previewUrl,
    }));

    setIsCropMode(false);
  };

  const handleCreateLineUp = async () => {
    try {
      if (!newLineUp.name || !newLineUp.category) {
        showError("Please fill in all required fields");
        return;
      }

      const currentToken = localStorage.getItem("token");
      const currentBrandId =
        selectedBrand?._id || localStorage.getItem("selectedBrandId");

      if (!currentToken || !currentBrandId) {
        showError("Authentication required");
        return;
      }

      showLoading("Creating lineup...");
      setLoading(true);

      const formData = new FormData();
      formData.append("name", newLineUp.name);
      formData.append("category", newLineUp.category);
      formData.append("subtitle", newLineUp.subtitle || "");
      formData.append("brandId", currentBrandId);

      if (newLineUp.avatarFile) {
        formData.append("avatar", newLineUp.avatarFile);
      }

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
    e.stopPropagation();
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

      const currentToken = localStorage.getItem("token");

      if (!currentToken || !lineupToEdit._id) {
        showError("Authentication required");
        return;
      }

      showLoading("Updating lineup...");
      setLoading(true);

      const formData = new FormData();
      formData.append("name", newLineUp.name);
      formData.append("category", newLineUp.category);
      formData.append("subtitle", newLineUp.subtitle || "");

      if (newLineUp.avatarFile) {
        formData.append("avatar", newLineUp.avatarFile);
      }

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

      setLineUps((prev) =>
        prev.map((item) =>
          item._id === updatedLineUp._id ? updatedLineUp : item
        )
      );

      setSelectedLineUps((prev) =>
        prev.map((item) =>
          item._id === updatedLineUp._id ? updatedLineUp : item
        )
      );

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
    e.stopPropagation();
    setDeleteConfirm({ show: true, type: 'lineup', item: lineup });
  };

  const handleDeleteLineUp = async () => {
    const lineupToDelete = deleteConfirm.item;
    if (!lineupToDelete) return;

    try {
      const currentToken = localStorage.getItem("token");

      if (!currentToken) {
        showError("Authentication required");
        return;
      }

      setLoading(true);
      showLoading("Deleting lineup...");

      const response = await axios({
        method: "DELETE",
        url: `${process.env.REACT_APP_API_BASE_URL}/lineup/${lineupToDelete._id}`,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        setLineUps((prev) =>
          prev.filter((item) => item._id !== lineupToDelete._id)
        );

        setSelectedLineUps((prev) =>
          prev.filter((item) => item._id !== lineupToDelete._id)
        );

        showSuccess("Lineup deleted successfully");
      } else {
        showError(response.data.message || "Failed to delete lineup");
      }
    } catch (error) {
      console.error("Error deleting lineup:", error);
      const errorMessage = error.response?.data?.message || error.message;
      showError(`Failed to delete lineup: ${errorMessage}`);
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, type: null, item: null });
    }
  };

  const handleSave = async () => {
    try {
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

  const handleCategorySelect = (category) => {
    setNewLineUp((prev) => ({
      ...prev,
      category,
    }));
  };

  const handleSubtitleSelect = (subtitle) => {
    setNewLineUp((prev) => ({
      ...prev,
      subtitle,
    }));
  };

  // Open form with pre-filled category (when clicking + on category header)
  const openFormWithCategory = (category) => {
    setNewLineUp({
      name: "",
      category: category,
      subtitle: "",
      avatar: null,
      avatarPreview: null,
    });
    setIsEditing(false);
    setIsAddingNew(true);
  };

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

  const handleCategoryDeleteClick = (e, category) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, type: 'category', item: category });
  };

  const handleSubtitleDeleteClick = (e, subtitle) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, type: 'subtitle', item: subtitle });
  };

  const handleDeleteCategory = async () => {
    const categoryToDelete = deleteConfirm.item;
    if (!categoryToDelete) return;

    try {
      const currentToken = localStorage.getItem("token");
      const currentBrandId =
        selectedBrand?._id || localStorage.getItem("selectedBrandId");

      if (!currentToken || !currentBrandId) {
        showError("Authentication required");
        return;
      }

      setLoading(true);
      showLoading("Deleting category...");

      const response = await axios({
        method: "DELETE",
        url: `${process.env.REACT_APP_API_BASE_URL}/lineup/category/${currentBrandId}/${categoryToDelete}`,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        await fetchLineUps();
        showSuccess(`Category "${categoryToDelete}" deleted`);
      } else {
        showError(response.data.message || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      const errorMessage = error.response?.data?.message || error.message;
      showError(`Failed to delete category: ${errorMessage}`);
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, type: null, item: null });
    }
  };

  const handleDeleteSubtitle = async () => {
    const subtitleToDelete = deleteConfirm.item;
    if (!subtitleToDelete) return;

    try {
      const currentToken = localStorage.getItem("token");
      const currentBrandId =
        selectedBrand?._id || localStorage.getItem("selectedBrandId");

      if (!currentToken || !currentBrandId) {
        showError("Authentication required");
        return;
      }

      setLoading(true);
      showLoading("Deleting subtitle...");

      const response = await axios({
        method: "DELETE",
        url: `${process.env.REACT_APP_API_BASE_URL}/lineup/subtitle/${currentBrandId}/${subtitleToDelete}`,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        await fetchLineUps();
        showSuccess(`Subtitle "${subtitleToDelete}" deleted`);
      } else {
        showError(response.data.message || "Failed to delete subtitle");
      }
    } catch (error) {
      console.error("Error deleting subtitle:", error);
      const errorMessage = error.response?.data?.message || error.message;
      showError(`Failed to delete subtitle: ${errorMessage}`);
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, type: null, item: null });
    }
  };

  const getDeleteDialogContent = () => {
    switch (deleteConfirm.type) {
      case 'lineup':
        return {
          title: 'Delete Lineup',
          message: `Are you sure you want to delete ${deleteConfirm.item?.name}? This action cannot be undone.`,
          onConfirm: handleDeleteLineUp,
        };
      case 'category':
        return {
          title: 'Delete Category',
          message: `Are you sure you want to delete the category "${deleteConfirm.item}"? All lineups using this category will be changed to "Other".`,
          onConfirm: handleDeleteCategory,
        };
      case 'subtitle':
        return {
          title: 'Delete Subtitle',
          message: `Are you sure you want to delete the subtitle "${deleteConfirm.item}"? All lineups using this subtitle will have their subtitle cleared.`,
          onConfirm: handleDeleteSubtitle,
        };
      default:
        return { title: '', message: '', onConfirm: () => {} };
    }
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (newLineUp.avatarPreview) {
        URL.revokeObjectURL(newLineUp.avatarPreview);
      }
    };
  }, [newLineUp.avatarPreview]);

  // Create a dummy user object for AvatarUpload component
  const dummyUser = {
    _id: "lineup-avatar-" + Date.now(),
    avatar: newLineUp.avatarPreview,
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

          {/* Crop Modal Portal */}
          {isCropMode &&
            createPortal(
              <div
                className="crop-modal-wrapper"
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
                    width: "90%",
                    maxWidth: "600px",
                    pointerEvents: "auto",
                  }}
                >
                  <AvatarUpload
                    user={dummyUser}
                    setUser={() => {}}
                    isCropMode={true}
                    setIsCropMode={setIsCropMode}
                    onImageCropped={handleImageCropped}
                    isLineUpMode={true}
                  />
                </div>
              </div>,
              document.body
            )}

          <h2>Line Up</h2>

          <div className="lineup-content">
            {loading ? (
              <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
              </div>
            ) : Object.keys(groupedLineups).length === 0 ? (
              <div className="lineup-empty">
                <RiMusicLine />
                <p>No lineups yet. Add your first artist!</p>
              </div>
            ) : (
              /* Category Groups */
              Object.entries(groupedLineups).map(([category, artists]) => (
                <div className="lineup-category-group" key={category}>
                  <div className="category-header">
                    <span className="category-name">{category}</span>
                    <button
                      className="add-to-category"
                      onClick={() => openFormWithCategory(category)}
                      title={`Add to ${category}`}
                    >
                      <RiAddLine />
                    </button>
                  </div>
                  <div className="lineup-chips">
                    {artists.map((artist) => {
                      const isSelected = selectedLineUps.some(
                        (item) => item._id === artist._id
                      );
                      const avatarSrc = artist.avatar
                        ? typeof artist.avatar === "string"
                          ? artist.avatar
                          : artist.avatar.thumbnail || artist.avatar.medium
                        : null;

                      return (
                        <div
                          key={artist._id}
                          className={`lineup-chip ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleLineUpSelection(artist)}
                        >
                          {avatarSrc && (
                            <img
                              src={avatarSrc}
                              alt=""
                              className="chip-avatar"
                            />
                          )}
                          <span className="chip-name">{artist.name}</span>
                          {artist.subtitle && (
                            <span className="chip-subtitle">
                              • {artist.subtitle}
                            </span>
                          )}
                          {isSelected && (
                            <span className="selected-check">
                              <RiCheckLine />
                            </span>
                          )}
                          <div className="chip-actions">
                            <button
                              className="chip-action-btn"
                              onClick={(e) => handleEditClick(e, artist)}
                              title="Edit"
                            >
                              <RiEditLine />
                            </button>
                            <button
                              className="chip-action-btn delete-btn"
                              onClick={(e) => handleDeleteClick(e, artist)}
                              title="Delete"
                            >
                              <RiDeleteBinLine />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Add New Button */}
            {!loading && (
              <button
                className="add-new-lineup-btn"
                onClick={() => setIsAddingNew(true)}
              >
                <RiAddLine />
                <span>Add New</span>
              </button>
            )}
          </div>

          {/* Add/Edit Form Popup */}
          {isAddingNew && (
            <div className="lineup-form-overlay">
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
                  {/* Avatar Upload */}
                  <div
                    className="avatar-upload-container"
                    onClick={() => {
                      setIsCropMode(true);
                      setModalKey(Date.now());
                    }}
                  >
                    {newLineUp.avatarPreview ? (
                      <div className="avatar-preview">
                        <img
                          src={newLineUp.avatarPreview}
                          alt="Avatar preview"
                        />
                      </div>
                    ) : (
                      <div className="avatar-upload-placeholder">
                        <RiImageAddLine />
                        <span>Upload</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Categories */}
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
                              >
                                <RiDeleteBin2Line />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="no-categories">No categories yet</div>
                      )}
                    </div>
                  </div>

                  {/* Quick Subtitles */}
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
                              >
                                <RiDeleteBin2Line />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="no-categories">No subtitles yet</div>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
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
                        placeholder="e.g., Berlin, Special Guest"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
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

          {/* Bottom Actions */}
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
      {deleteConfirm.show && deleteConfirm.item && (() => {
        const { title, message, onConfirm } = getDeleteDialogContent();
        return (
          <div className="delete-confirmation-overlay">
            <div className="delete-confirmation">
              <h3>{title}</h3>
              <p>{message}</p>
              <div className="delete-actions">
                <button
                  className="cancel-delete"
                  onClick={() => setDeleteConfirm({ show: false, type: null, item: null })}
                >
                  Cancel
                </button>
                <button className="confirm-delete" onClick={onConfirm}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AnimatePresence>
  );
}

export default LineUp;
