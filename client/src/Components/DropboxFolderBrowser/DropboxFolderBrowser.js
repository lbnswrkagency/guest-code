import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./DropboxFolderBrowser.scss";
import axiosInstance from "../../utils/axiosConfig";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiFolderLine,
  RiFolderOpenLine,
  RiArrowRightSLine,
  RiLoader4Line,
  RiErrorWarningLine,
  RiRefreshLine,
  RiHomeLine,
  RiCheckLine,
} from "react-icons/ri";

const DropboxFolderBrowser = ({ 
  selectedPath = "", 
  onSelectPath,
  placeholder = "Select a folder from your Dropbox",
  eventDate = null, // Date object of the event
  brandDropboxBaseFolder = "", // Brand's dropbox base folder path
  autoSuggest = false // Whether to auto-suggest/select based on date
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [suggestedFolder, setSuggestedFolder] = useState(null);

  // Helper function to format date as YYYYMMDD
  const formatDateForFolder = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // Helper function to check if folder name contains date in YYYYMMDD format
  const extractDateFromFolderName = (folderName) => {
    // Look for YYYYMMDD pattern in folder name (20251102, etc.)
    const dateMatch = folderName.match(/(\d{8})/);
    return dateMatch ? dateMatch[1] : null;
  };

  // Helper function to find suggested folder based on event date
  const findSuggestedFolder = useCallback((folderList, targetDate) => {
    if (!targetDate || !folderList.length) {
      return null;
    }
    
    const targetDateStr = formatDateForFolder(targetDate);
    if (!targetDateStr) return null;

    // Look for exact date match in folder names
    const exactMatch = folderList.find(folder => {
      const folderDate = extractDateFromFolderName(folder.name);
      return folderDate === targetDateStr;
    });

    return exactMatch || null;
  }, []);

  // Fetch folders from Dropbox API
  const fetchFolders = useCallback(async (path = "") => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get("/dropbox/folder", {
        params: { path: path || "" }
      });

      if (response.data && Array.isArray(response.data)) {
        // Filter only folders from the response
        let folderItems = response.data.filter(item => {
          // Handle both Dropbox API response format and our processed format
          return item['.tag'] === 'folder' || item.tag === 'folder';
        });

        // If autoSuggest is enabled and we have an event date, prioritize folders with date format
        if (autoSuggest && eventDate) {
          const eventDateStr = formatDateForFolder(eventDate);
          
          // Sort folders to prioritize date matches
          folderItems = folderItems.sort((a, b) => {
            const aHasDate = extractDateFromFolderName(a.name);
            const bHasDate = extractDateFromFolderName(b.name);
            const aMatchesEvent = aHasDate === eventDateStr;
            const bMatchesEvent = bHasDate === eventDateStr;

            // Event date matches come first
            if (aMatchesEvent && !bMatchesEvent) return -1;
            if (!aMatchesEvent && bMatchesEvent) return 1;

            // Date format folders come next
            if (aHasDate && !bHasDate) return -1;
            if (!aHasDate && bHasDate) return 1;

            // Alphabetical for same priority
            return a.name.localeCompare(b.name);
          });
        }
        
        setFolders(folderItems);

        // Auto-suggest folder based on event date
        if (autoSuggest && eventDate && folderItems.length > 0) {
          const suggested = findSuggestedFolder(folderItems, eventDate);
          if (suggested) {
            setSuggestedFolder(suggested);
            // Auto-select if no path is currently selected
            if (!selectedPath) {
              const suggestedPath = path ? `${path}/${suggested.name}` : `/${suggested.name}`;
              onSelectPath && onSelectPath(suggestedPath);
            }
          } else {
            setSuggestedFolder(null);
          }
        }
      } else {
        setFolders([]);
      }
    } catch (err) {
      console.error("Failed to fetch folders:", err);
      let errorMessage = "Failed to load folders. Please check Dropbox connection.";

      if (err.response?.status === 409) {
        // Path not found - common for auto-generated paths that don't exist yet
        errorMessage = `Folder not found at this path. Navigate up to find existing folders.`;
      } else if (err.response?.status === 404) {
        errorMessage = "Dropbox API endpoint not found. Please check server configuration.";
      } else if (err.response?.status === 401) {
        errorMessage = "Dropbox access token has expired. Please update your Dropbox API credentials in the server configuration.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
      setFolders([]);
      // DON'T close modal - let user navigate or retry
    } finally {
      setLoading(false);
    }
  }, [autoSuggest, eventDate, selectedPath, onSelectPath, findSuggestedFolder]);

  // Initialize breadcrumbs from current path
  useEffect(() => {
    if (currentPath) {
      const pathParts = currentPath.split('/').filter(Boolean);
      const crumbs = [{ name: "Dropbox", path: "" }];
      
      let buildPath = "";
      for (const part of pathParts) {
        buildPath += `/${part}`;
        crumbs.push({ name: part, path: buildPath });
      }
      
      setBreadcrumbs(crumbs);
    } else {
      setBreadcrumbs([{ name: "Dropbox", path: "" }]);
    }
  }, [currentPath]);

  // Navigate to folder
  const navigateToFolder = (folderPath) => {
    setCurrentPath(folderPath);
    fetchFolders(folderPath);
  };

  // Navigate via breadcrumb
  const navigateToBreadcrumb = (path) => {
    setCurrentPath(path);
    fetchFolders(path);
  };

  // Select current path
  const selectCurrentPath = () => {
    onSelectPath(currentPath);
    setIsOpen(false);
  };

  // Open browser and load root folders
  const openBrowser = () => {
    setIsOpen(true);
    setError(null); // Clear any previous errors

    // Priority: 1) selectedPath (navigate to it directly), 2) brand base folder, 3) root
    let startPath = "";

    if (selectedPath && selectedPath.trim() !== "") {
      // Start at the selectedPath itself so user sees current context
      // If the path doesn't exist, they can navigate up from the error state
      startPath = selectedPath;
    } else if (brandDropboxBaseFolder && brandDropboxBaseFolder.trim() !== "") {
      // No selected path - start at brand base folder
      startPath = brandDropboxBaseFolder;
    }
    // Final fallback is root (empty string)

    setCurrentPath(startPath);
    fetchFolders(startPath);
  };

  return (
    <div className="dropbox-folder-browser">
      {/* Selected Path Display */}
      <div className="selected-path-display" onClick={openBrowser}>
        <div className="path-value">
          {selectedPath ? (
            <span className="path-text">{selectedPath}</span>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
        </div>
        <RiArrowRightSLine className={`expand-icon ${isOpen ? 'open' : ''}`} />
      </div>

      {/* Folder Browser Modal - rendered via portal to escape stacking context */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="browser-overlay dropbox-browser-portal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            >
            <motion.div
              className="browser-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="browser-header">
                <h4>Select Dropbox Folder</h4>
                <div className="header-actions">
                  <button 
                    className="refresh-btn"
                    onClick={() => fetchFolders(currentPath)}
                    disabled={loading}
                  >
                    <RiRefreshLine className={loading ? 'spinning' : ''} />
                  </button>
                  <button 
                    className="close-btn"
                    onClick={() => setIsOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Breadcrumbs */}
              <div className="breadcrumbs">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <button
                      className={`breadcrumb ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                      onClick={() => navigateToBreadcrumb(crumb.path)}
                    >
                      {index === 0 ? <RiHomeLine /> : null}
                      {crumb.name}
                    </button>
                    {index < breadcrumbs.length - 1 && (
                      <RiArrowRightSLine className="breadcrumb-separator" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Current Path Selection */}
              <div className="current-selection">
                <div className="current-path">
                  <span>Current: </span>
                  <code>{currentPath || "/"}</code>
                </div>
                <button 
                  className="select-btn"
                  onClick={selectCurrentPath}
                >
                  <RiCheckLine />
                  Select This Folder
                </button>
              </div>

              {/* Folder List */}
              <div className="browser-content">
                {loading ? (
                  <div className="loading-state">
                    <RiLoader4Line className="spinner" />
                    <span>Loading folders...</span>
                  </div>
                ) : error ? (
                  <div className="error-state">
                    <RiErrorWarningLine />
                    <span>{error}</span>
                    <div className="error-actions">
                      <button onClick={() => fetchFolders(currentPath)}>Retry</button>
                      {currentPath && (
                        <button
                          className="go-up-btn"
                          onClick={() => {
                            // Navigate to parent directory
                            const pathParts = currentPath.split('/').filter(Boolean);
                            pathParts.pop();
                            const parentPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '';
                            navigateToBreadcrumb(parentPath);
                          }}
                        >
                          Go Up
                        </button>
                      )}
                      <button
                        className="go-root-btn"
                        onClick={() => navigateToBreadcrumb('')}
                      >
                        Go to Root
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="folders-list">
                    {folders.length === 0 ? (
                      <div className="empty-state">
                        <RiFolderLine />
                        <span>No folders found</span>
                      </div>
                    ) : (
                      folders.map((folder) => {
                        const isSuggested = suggestedFolder && folder.id === suggestedFolder.id;
                        const folderDate = extractDateFromFolderName(folder.name);
                        const eventDateStr = eventDate ? formatDateForFolder(eventDate) : null;
                        const isDateMatch = folderDate && eventDateStr && folderDate === eventDateStr;

                        return (
                          <motion.div
                            key={folder.id}
                            className={`folder-item ${isSuggested ? 'suggested' : ''} ${isDateMatch ? 'date-match' : ''}`}
                            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                            onClick={() => navigateToFolder(folder.path_lower)}
                          >
                            <RiFolderLine className="folder-icon" />
                            <div className="folder-content">
                              <span className="folder-name">{folder.name}</span>
                              {isSuggested && (
                                <span className="suggested-badge">Suggested</span>
                              )}
                              {isDateMatch && !isSuggested && (
                                <span className="date-badge">Date Match</span>
                              )}
                            </div>
                            <RiArrowRightSLine className="enter-icon" />
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default DropboxFolderBrowser;