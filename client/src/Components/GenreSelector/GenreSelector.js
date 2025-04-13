import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiSearchLine,
  RiAddLine,
  RiMusicLine,
  RiDeleteBinLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import "./GenreSelector.scss";

const GenreSelector = ({
  event,
  onClose,
  selectedBrand,
  onSave,
  initialSelectedGenres = [],
}) => {
  const toast = useToast();
  const [selectedGenres, setSelectedGenres] = useState(initialSelectedGenres);
  const [brandGenres, setBrandGenres] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewGenreForm, setShowNewGenreForm] = useState(false);
  const [newGenre, setNewGenre] = useState("");

  // Fetch genres for the brand
  useEffect(() => {
    if (selectedBrand?._id) {
      fetchBrandGenres();
    }
  }, [selectedBrand]);

  const fetchBrandGenres = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/genres/brand/${selectedBrand._id}`
      );
      setBrandGenres(response.data || []);
    } catch (error) {
      console.error("Error fetching brand genres:", error);
      toast.showError("Failed to load music genres");
    } finally {
      setLoading(false);
    }
  };

  // Filter genres based on search
  const filteredGenres = search
    ? brandGenres.filter((genre) =>
        genre.name.toLowerCase().includes(search.toLowerCase())
      )
    : brandGenres;

  // Handle genre selection
  const toggleGenreSelection = (genre) => {
    setSelectedGenres((prev) => {
      // Check if already selected
      const isSelected = prev.some((g) => g._id === genre._id);

      if (isSelected) {
        return prev.filter((g) => g._id !== genre._id);
      } else {
        return [...prev, genre];
      }
    });
  };

  // Create a new genre
  const handleCreateGenre = async () => {
    if (!newGenre.trim()) {
      toast.showError("Genre name cannot be empty");
      return;
    }

    try {
      const response = await axiosInstance.post("/genres", {
        brandId: selectedBrand._id,
        name: newGenre.trim(),
        icon: "music",
      });

      // Add new genre to the list
      setBrandGenres((prev) => [...prev, response.data]);

      // Select the new genre
      setSelectedGenres((prev) => [...prev, response.data]);

      // Reset the form
      setNewGenre("");
      setShowNewGenreForm(false);

      toast.showSuccess("Genre created successfully");
    } catch (error) {
      console.error("Error creating genre:", error);
      toast.showError(
        error.response?.data?.message || "Failed to create genre"
      );
    }
  };

  // Save selections and close
  const handleSave = () => {
    onSave(selectedGenres);
    onClose();
  };

  return (
    <motion.div
      className="genre-selector-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="genre-selector"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="genre-selector-header">
          <h2>
            <RiMusicLine className="icon" />
            Music Genres
          </h2>
          <RiCloseLine className="close-button" onClick={onClose} />
        </div>

        <div className="genre-selector-content">
          {/* Search and add section */}
          <div className="search-container">
            <div className="search-box">
              <RiSearchLine className="search-icon" />
              <input
                type="text"
                placeholder="Search genres..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              className="add-genre-button"
              onClick={() => setShowNewGenreForm(true)}
            >
              <RiAddLine />
              <span>Add New</span>
            </button>
          </div>

          {/* New genre form */}
          {showNewGenreForm && (
            <div className="new-genre-form">
              <input
                type="text"
                placeholder="Enter genre name..."
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                autoFocus
              />
              <div className="form-actions">
                <button
                  className="cancel-button"
                  onClick={() => {
                    setShowNewGenreForm(false);
                    setNewGenre("");
                  }}
                >
                  Cancel
                </button>
                <button className="create-button" onClick={handleCreateGenre}>
                  Create Genre
                </button>
              </div>
            </div>
          )}

          {/* Selected genres */}
          {selectedGenres.length > 0 && (
            <div className="selected-genres">
              <h3>Selected Genres</h3>
              <div className="genre-tags">
                {selectedGenres.map((genre) => (
                  <div className="genre-tag" key={genre._id}>
                    <RiMusicLine className="icon" />
                    <span>{genre.name}</span>
                    <RiCloseLine
                      className="remove-icon"
                      onClick={() => toggleGenreSelection(genre)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available genres */}
          <div className="available-genres">
            <h3>Available Genres</h3>

            {loading ? (
              <div className="loading-message">Loading genres...</div>
            ) : filteredGenres.length === 0 ? (
              <div className="empty-message">
                {search ? "No genres match your search" : "No genres available"}
              </div>
            ) : (
              <div className="genre-grid">
                {filteredGenres.map((genre) => {
                  const isSelected = selectedGenres.some(
                    (g) => g._id === genre._id
                  );

                  return (
                    <div
                      key={genre._id}
                      className={`genre-item ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleGenreSelection(genre)}
                    >
                      <RiMusicLine className="genre-icon" />
                      <span className="genre-name">{genre.name}</span>
                      {isSelected && <div className="selected-indicator"></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="genre-selector-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Save Genres
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GenreSelector;
