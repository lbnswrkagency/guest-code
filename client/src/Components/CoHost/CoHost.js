import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./CoHost.scss";
import {
  RiSearchLine,
  RiCloseLine,
  RiAddLine,
  RiSettings3Line,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import CoHostRoleSettings from "./CoHostRoleSettings";

const CoHost = ({
  selectedCoHosts = [],
  onUpdate,
  currentBrandId,
  eventId,
  eventCodeSettings = [],
}) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showRoleSettings, setShowRoleSettings] = useState(false);
  const [selectedCoHostForSettings, setSelectedCoHostForSettings] =
    useState(null);
  const searchTimeoutRef = useRef(null);
  const searchRef = useRef(null);

  // Handle clicks outside search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search for brands
  const searchBrands = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axiosInstance.get(`/co-hosts/search`, {
        params: {
          q: query,
          exclude: currentBrandId, // Don't show the current brand in results
        },
      });

      // Filter out already selected brands and the current brand
      const filteredResults = response.data.filter(
        (brand) =>
          !selectedCoHosts
            .filter((selected) => selected && selected._id) // Filter out null/undefined co-hosts
            .some((selected) => selected._id === brand._id) &&
          brand._id !== currentBrandId
      );

      setSearchResults(filteredResults);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching brands:", error);
      toast.showError("Failed to search brands");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchBrands(query);
    }, 300);
  };

  // Add a co-host
  const handleAddCoHost = (brand) => {
    const updatedCoHosts = [...selectedCoHosts, brand];
    onUpdate(updatedCoHosts);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  // Remove a co-host
  const handleRemoveCoHost = (brandId) => {
    const updatedCoHosts = selectedCoHosts.filter(
      (brand) => brand._id !== brandId
    );
    onUpdate(updatedCoHosts);
  };

  // Open role settings for a co-host
  const handleOpenRoleSettings = (brand) => {
    console.log("🔧 [CoHost] Opening role settings for brand:", {
      brand: { id: brand._id, name: brand.name },
      eventId,
      eventCodeSettingsCount: eventCodeSettings.length,
    });
    setSelectedCoHostForSettings(brand);
    setShowRoleSettings(true);
  };

  // Close role settings
  const handleCloseRoleSettings = () => {
    console.log("❌ [CoHost] Closing role settings modal");
    setShowRoleSettings(false);
    setSelectedCoHostForSettings(null);
  };

  return (
    <div className="co-host-container">
      {/* Selected Co-Hosts */}
      <AnimatePresence>
        {selectedCoHosts.length > 0 && (
          <div className="selected-co-hosts">
            {selectedCoHosts
              .filter((brand) => brand && brand._id) // Filter out null/undefined brands
              .map((brand) => (
              <motion.div
                key={brand._id}
                className="co-host-item"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <div className="co-host-content">
                  {brand.logo?.thumbnail ? (
                    <img
                      src={brand.logo.thumbnail}
                      alt={brand.name || 'Unknown Brand'}
                      className="co-host-logo"
                    />
                  ) : (
                    <div className="co-host-logo-placeholder">
                      {brand.name ? brand.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div className="co-host-info">
                    <span className="co-host-name">{brand.name || 'Unknown Brand'}</span>
                    <span className="co-host-username">@{brand.username || 'unknown'}</span>
                  </div>
                </div>
                <div className="co-host-actions">
                  <button
                    type="button"
                    className="settings-co-host"
                    onClick={() => handleOpenRoleSettings(brand)}
                    aria-label={`Configure permissions for ${brand.name || 'Unknown Brand'}`}
                    title="Configure Permissions"
                  >
                    <RiSettings3Line />
                  </button>
                  <button
                    type="button"
                    className="remove-co-host"
                    onClick={() => handleRemoveCoHost(brand._id)}
                    aria-label={`Remove ${brand.name || 'Unknown Brand'} as co-host`}
                    title="Remove Co-Host"
                  >
                    <RiCloseLine />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Search Input */}
      <div className="co-host-search" ref={searchRef}>
        <div className="search-input-wrapper">
          <RiSearchLine className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={
              selectedCoHosts.length === 0
                ? "Search for co-host brands..."
                : "Add another co-host..."
            }
            className="search-input"
            onFocus={() => searchQuery && setShowResults(true)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setShowResults(false);
              }}
            >
              <RiCloseLine />
            </button>
          )}
        </div>

        {/* Search Results */}
        <AnimatePresence>
          {showResults && searchResults.length > 0 && (
            <motion.div
              className="search-results-cohost"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {searchResults.map((brand) => (
                <div
                  key={brand._id}
                  className="search-result-item"
                  onClick={() => handleAddCoHost(brand)}
                >
                  <div className="result-content">
                    {brand.logo?.thumbnail ? (
                      <img
                        src={brand.logo.thumbnail}
                        alt={brand.name || 'Unknown Brand'}
                        className="result-logo"
                      />
                    ) : (
                      <div className="result-logo-placeholder">
                        {brand.name ? brand.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <div className="result-info">
                      <span className="result-name">{brand.name || 'Unknown Brand'}</span>
                      <span className="result-username">@{brand.username || 'unknown'}</span>
                    </div>
                  </div>
                  <RiAddLine className="add-icon" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isSearching && (
          <div className="search-loading">
            <span>Searching...</span>
          </div>
        )}

        {/* No Results */}
        {showResults &&
          searchQuery &&
          !isSearching &&
          searchResults.length === 0 && (
            <div className="no-results">
              <span>No brands found</span>
            </div>
          )}
      </div>

      {/* Role Settings Modal - Rendered using Portal */}
      {showRoleSettings &&
        (console.log("🚪 [CoHost] Rendering role settings modal portal with:", {
          showRoleSettings,
          selectedCoHostForSettings: selectedCoHostForSettings
            ? {
                id: selectedCoHostForSettings._id,
                name: selectedCoHostForSettings.name,
              }
            : null,
          eventId,
        }),
        ReactDOM.createPortal(
          <CoHostRoleSettings
            isOpen={showRoleSettings}
            onClose={handleCloseRoleSettings}
            coHostBrand={selectedCoHostForSettings}
            eventId={eventId}
            eventCodeSettings={eventCodeSettings}
            onPermissionsUpdate={(brandId, permissions) => {
              // Handle permissions update if needed
              console.log(
                "✅ [CoHost] Permissions updated for brand:",
                brandId,
                permissions
              );
            }}
          />,
          document.body
        ))}
    </div>
  );
};

export default CoHost;
