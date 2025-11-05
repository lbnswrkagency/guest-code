import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./EventGallery.scss";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import ProgressiveImage from "../ProgressiveImage/ProgressiveImage";
import {
  RiImageLine,
  RiVideoLine,
  RiCloseLine,
  RiDownloadLine,
  RiFullscreenLine,
  RiPlayCircleLine,
  RiLoader4Line,
  RiErrorWarningLine,
  RiSearchLine,
  RiCheckboxBlankLine,
  RiCheckboxLine,
  RiDownload2Line,
  RiCheckLine,
  RiGalleryLine,
  RiZoomInLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarEventLine,
} from "react-icons/ri";

const EventGallery = ({ 
  event, 
  isOpen, 
  onClose, 
  dropboxFolderPath, 
  eventTitle = "Event Gallery",
  brandId,
  brandUsername,
  selectedEventId = null,
  onEventChange = () => {}
}) => {
  const [media, setMedia] = useState({ photos: [], videos: [], totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [imageLoading, setImageLoading] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [availableGalleries, setAvailableGalleries] = useState([]);
  const [loadingGalleries, setLoadingGalleries] = useState(false);
  const [currentGalleryTitle, setCurrentGalleryTitle] = useState(eventTitle);
  const [selectedGalleryEventId, setSelectedGalleryEventId] = useState(selectedEventId);
  const [loadingMoreThumbnails, setLoadingMoreThumbnails] = useState(false);
  const [hasMoreToLoad, setHasMoreToLoad] = useState(false);
  const { showToast, showSuccess, showError } = useToast();

  // Filter media based on search query
  const filteredMedia = useMemo(() => {
    if (!searchQuery.trim()) return media;
    
    const query = searchQuery.toLowerCase();
    const filteredPhotos = media.photos.filter(photo =>
      photo.name?.toLowerCase().includes(query)
    );
    const filteredVideos = media.videos.filter(video =>
      video.name?.toLowerCase().includes(query)
    );
    
    return {
      photos: filteredPhotos,
      videos: filteredVideos,
      totalCount: filteredPhotos.length + filteredVideos.length
    };
  }, [media, searchQuery]);

  // Fetch gallery media from Dropbox
  const fetchGalleryMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = "";
      let params = {};

      // Priority 1: Use selectedGalleryEventId if provided
      if (selectedGalleryEventId && selectedGalleryEventId !== 'latest') {
        endpoint = `/dropbox/event/${selectedGalleryEventId}/gallery`;
      }
      // Priority 2: Use latest brand gallery if selectedGalleryEventId is 'latest'
      else if (selectedGalleryEventId === 'latest' && (brandId || brandUsername)) {
        if (brandId) {
          endpoint = `/dropbox/brand/${brandId}/galleries/latest`;
        } else if (brandUsername) {
          // Get brand ID from username first
          try {
            const cleanUsername = brandUsername.replace(/^@/, "");
            const brandResponse = await axiosInstance.get(`/brand/username/${cleanUsername}`);
            if (brandResponse.data && brandResponse.data._id) {
              endpoint = `/dropbox/brand/${brandResponse.data._id}/galleries/latest`;
            }
          } catch (brandError) {
            console.error("Error getting brand by username:", brandError);
          }
        }
      }
      // Priority 3: Use current event if no selectedEventId
      else if (event?._id) {
        endpoint = `/dropbox/event/${event._id}/gallery`;
      }
      // Priority 4: Use dropbox path directly
      else {
        const folderPath = dropboxFolderPath || event?.dropboxFolderPath;
        if (folderPath) {
          endpoint = "/dropbox/gallery";
          params = { path: folderPath };
        }
      }

      if (!endpoint) {
        setLoading(false);
        return;
      }
      
      const response = await axiosInstance.get(endpoint, { params });

      if (response.data && response.data.success) {
        const mediaData = response.data.media || { photos: [], videos: [], totalCount: 0 };
        setMedia(mediaData);
        
        // Check if there are images that need lazy loading
        const photosNeedingLoad = mediaData.photos.filter(photo => photo.needsLazyLoad || !photo.thumbnail);
        setHasMoreToLoad(photosNeedingLoad.length > 0);
        
        // Update gallery title if provided in response
        if (response.data.eventTitle) {
          setCurrentGalleryTitle(`${response.data.eventTitle} - Gallery`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
      setError(err.response?.data?.message || "Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }, [dropboxFolderPath, event, selectedGalleryEventId, brandId, brandUsername]);

  // Load more thumbnails for images that don't have them yet
  const loadMoreThumbnails = useCallback(async () => {
    try {
      setLoadingMoreThumbnails(true);
      
      // Find photos that need thumbnails
      const photosNeedingLoad = media.photos.filter(photo => photo.needsLazyLoad || !photo.thumbnail);
      
      if (photosNeedingLoad.length === 0) {
        setHasMoreToLoad(false);
        return;
      }
      
      // Get file paths for lazy loading (limit to next batch)
      const LAZY_LOAD_BATCH_SIZE = 20;
      const batchToLoad = photosNeedingLoad.slice(0, LAZY_LOAD_BATCH_SIZE);
      const filePaths = batchToLoad.map(photo => photo.path);
      
      console.log(`🔄 Loading ${filePaths.length} more thumbnails...`);
      
      const response = await axiosInstance.post('/dropbox/thumbnails/load', {
        filePaths
      });
      
      if (response.data && response.data.success) {
        const thumbnailData = response.data.thumbnails;
        
        // Update media state with new thumbnails
        setMedia(prevMedia => {
          const updatedPhotos = prevMedia.photos.map(photo => {
            const thumbnailResult = thumbnailData.find(t => t.filePath === photo.path);
            if (thumbnailResult && thumbnailResult.success) {
              return {
                ...photo,
                thumbnail: thumbnailResult.thumbnail,
                needsLazyLoad: false
              };
            }
            return photo;
          });
          
          // Check if there are still more to load
          const stillNeedingLoad = updatedPhotos.filter(photo => photo.needsLazyLoad || !photo.thumbnail);
          setHasMoreToLoad(stillNeedingLoad.length > 0);
          
          return {
            ...prevMedia,
            photos: updatedPhotos
          };
        });
        
        showSuccess(`Loaded ${response.data.stats.successful} more thumbnails`);
        
        console.log(`✅ Loaded ${response.data.stats.successful}/${filePaths.length} thumbnails (${response.data.stats.cached} from cache)`);
      }
      
    } catch (error) {
      console.error("Failed to load more thumbnails:", error);
      showError("Failed to load more thumbnails");
    } finally {
      setLoadingMoreThumbnails(false);
    }
  }, [media.photos, showSuccess, showError]);

  // Fetch available gallery dates for brand
  const fetchAvailableGalleries = useCallback(async () => {
    if (!brandId && !brandUsername) return;
    
    setLoadingGalleries(true);
    
    try {
      let endpoint = "";
      
      if (brandId) {
        endpoint = `/dropbox/brand/${brandId}/galleries/dates`;
      } else if (brandUsername) {
        // Get brand ID from username first
        const cleanUsername = brandUsername.replace(/^@/, "");
        const brandResponse = await axiosInstance.get(`/brand/username/${cleanUsername}`);
        if (brandResponse.data && brandResponse.data._id) {
          endpoint = `/dropbox/brand/${brandResponse.data._id}/galleries/dates`;
        }
      }
      
      if (endpoint) {
        const response = await axiosInstance.get(endpoint);
        
        if (response.data && response.data.success) {
          setAvailableGalleries(response.data.galleryOptions || []);
        }
      }
    } catch (error) {
      console.error("Error fetching available galleries:", error);
      setAvailableGalleries([]);
    } finally {
      setLoadingGalleries(false);
    }
  }, [brandId, brandUsername]);

  // Sync selectedGalleryEventId with selectedEventId prop
  useEffect(() => {
    setSelectedGalleryEventId(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    if (isOpen) {
      fetchGalleryMedia();
      // Also fetch available galleries for date selector
      if (brandId || brandUsername) {
        fetchAvailableGalleries();
      }
    }
  }, [fetchGalleryMedia, fetchAvailableGalleries, isOpen, brandId, brandUsername]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedMedia) return;

      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          navigateLightbox(-1);
          break;
        case "ArrowRight":
          navigateLightbox(1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMedia, lightboxIndex]);

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // Select all items
  const selectAllItems = () => {
    const allItems = [...filteredMedia.photos, ...filteredMedia.videos];
    if (selectedItems.size === allItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allItems.map(item => item.id)));
    }
  };

  // Handle download
  const handleDownload = async (path, filename) => {
    try {
      setDownloading(true);
      
      const response = await axiosInstance.get(
        `/dropbox/download/${encodeURIComponent(path)}`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess(`Downloaded ${filename}`);
    } catch (error) {
      console.error("Error downloading file:", error);
      showError("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  // Download selected items as ZIP
  const downloadSelectedItems = async () => {
    if (selectedItems.size === 0) {
      showError("Please select items to download");
      return;
    }

    try {
      setDownloading(true);
      
      const itemIds = Array.from(selectedItems);
      const endpoint = event?._id 
        ? `/events/${event._id}/gallery/download-zip`
        : "/dropbox/download-zip";
      
      const response = await axiosInstance.post(
        endpoint,
        { itemIds },
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventTitle}-gallery.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess(`Downloaded ${selectedItems.size} items`);
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Bulk download failed:", error);
      showError("Failed to download items");
    } finally {
      setDownloading(false);
    }
  };

  // Open lightbox
  const openLightbox = (index, mediaType) => {
    const allMedia = [...media.photos, ...media.videos];
    const mediaItem = mediaType === 'photo' 
      ? media.photos[index]
      : media.videos[index - media.photos.length];
    
    setSelectedMedia(mediaItem);
    setLightboxIndex(mediaType === 'photo' ? index : index + media.photos.length);
  };

  // Close lightbox
  const closeLightbox = () => {
    setSelectedMedia(null);
    setLightboxIndex(-1);
  };

  // Navigate in lightbox
  const navigateLightbox = (direction) => {
    const allMedia = [...media.photos, ...media.videos];
    let newIndex = lightboxIndex + direction;
    
    if (newIndex < 0) newIndex = allMedia.length - 1;
    if (newIndex >= allMedia.length) newIndex = 0;
    
    setLightboxIndex(newIndex);
    setSelectedMedia(allMedia[newIndex]);
  };

  // Handle image loading
  const handleImageLoad = (mediaId) => {
    setImageLoading(prev => ({ ...prev, [mediaId]: false }));
  };

  const handleImageLoadStart = (mediaId) => {
    setImageLoading(prev => ({ ...prev, [mediaId]: true }));
  };

  // Handle gallery selection from date selector
  const handleGallerySelect = (galleryOption) => {
    setSelectedGalleryEventId(galleryOption.eventId);
    onEventChange(galleryOption.eventId);
    setCurrentGalleryTitle(`${galleryOption.title} - Gallery`);
    setShowDateSelector(false);
    
    // Refetch gallery media for the selected event
    fetchGalleryMedia();
  };

  // Format date for display
  const formatGalleryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="event-gallery-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="event-gallery"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gallery Header */}
          <div className="gallery-header">
            <div className="header-content">
              <div className="title-section">
                <RiGalleryLine className="gallery-icon" />
                <div>
                  <h2>{currentGalleryTitle}</h2>
                  <p>{filteredMedia.totalCount} items</p>
                </div>
              </div>
              
              <div className="header-actions">
                {/* Date Selector - only show if we have multiple galleries */}
                {availableGalleries.length > 1 && (
                  <motion.button
                    className="date-selector-btn"
                    onClick={() => setShowDateSelector(!showDateSelector)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RiCalendarEventLine />
                    Select Another Date
                  </motion.button>
                )}
                {/* Search */}
                <div className="search-box">
                  <RiSearchLine className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search photos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Selection actions */}
                {selectedItems.size > 0 && (
                  <div className="selection-actions">
                    <span className="selection-count">
                      {selectedItems.size} selected
                    </span>
                    <motion.button
                      className="download-selected-btn"
                      onClick={downloadSelectedItems}
                      disabled={downloading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RiDownload2Line />
                      Download ZIP
                    </motion.button>
                  </div>
                )}

                {/* Select All */}
                <motion.button
                  className="select-all-btn"
                  onClick={selectAllItems}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RiCheckLine />
                  {selectedItems.size === filteredMedia.totalCount ? "Deselect All" : "Select All"}
                </motion.button>

                {/* Close */}
                <motion.button
                  className="close-btn"
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <RiCloseLine />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Date Selector Dropdown */}
          <AnimatePresence>
            {showDateSelector && (
              <motion.div
                className="date-selector-dropdown"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="date-selector-content">
                  <h4>Select Gallery Date</h4>
                  {loadingGalleries ? (
                    <div className="loading-galleries">
                      <RiLoader4Line className="spinner" />
                      <span>Loading available galleries...</span>
                    </div>
                  ) : availableGalleries.length === 0 ? (
                    <div className="no-galleries">
                      <RiImageLine />
                      <span>No other galleries available</span>
                    </div>
                  ) : (
                    <div className="gallery-options">
                      {availableGalleries.map((gallery) => (
                        <motion.div
                          key={gallery.eventId}
                          className={`gallery-option ${
                            selectedGalleryEventId === gallery.eventId ? 'selected' : ''
                          }`}
                          onClick={() => handleGallerySelect(gallery)}
                          whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="gallery-option-info">
                            <h5>{gallery.title}</h5>
                            {gallery.subTitle && <p>{gallery.subTitle}</p>}
                            <div className="gallery-option-meta">
                              <span className="gallery-date">
                                {formatGalleryDate(gallery.date)}
                              </span>
                              <span className="gallery-count">
                                {gallery.mediaCount} items
                              </span>
                            </div>
                          </div>
                          <RiArrowRightSLine className="gallery-option-arrow" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gallery Content */}
          <div className="gallery-content">
            {loading ? (
              <div className="loading-state">
                <RiLoader4Line className="spinner" />
                <span>Loading gallery...</span>
              </div>
            ) : error ? (
              <div className="error-state">
                <RiErrorWarningLine />
                <span>{error}</span>
                <button onClick={fetchGalleryMedia}>Retry</button>
              </div>
            ) : filteredMedia.totalCount === 0 ? (
              <div className="empty-state">
                <RiImageLine />
                <span>No photos or videos found</span>
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Photos Grid */}
                {filteredMedia.photos.length > 0 && (
                  <div className="media-section">
                    <h4 className="section-title">
                      <RiImageLine /> Photos ({filteredMedia.photos.length})
                    </h4>
                    <div className="media-grid photos-grid">
                      {filteredMedia.photos.map((photo, index) => (
                        <motion.div
                          key={photo.id}
                          className={`media-item photo-item ${selectedItems.has(photo.id) ? 'selected' : ''}`}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          {/* Selection Checkbox */}
                          <div 
                            className="selection-checkbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemSelection(photo.id);
                            }}
                          >
                            {selectedItems.has(photo.id) ? (
                              <RiCheckboxLine className="selected" />
                            ) : (
                              <RiCheckboxBlankLine />
                            )}
                          </div>

                          <div 
                            className="media-wrapper"
                            onClick={() => openLightbox(index, 'photo')}
                          >
                            {!photo.thumbnail ? (
                              <div className="thumbnail-placeholder">
                                <RiImageLine className="placeholder-icon" />
                                <span>Click to view or download</span>
                                <div className="placeholder-actions">
                                  <button 
                                    className="placeholder-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLightbox(index, 'photo');
                                    }}
                                    title="View in lightbox"
                                  >
                                    <RiZoomInLine />
                                  </button>
                                  <button 
                                    className="placeholder-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(photo.path, photo.name);
                                    }}
                                    title="Download image"
                                  >
                                    <RiDownloadLine />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {imageLoading[photo.id] !== false && (
                                  <div className="media-loading">
                                    <RiLoader4Line className="spinner" />
                                  </div>
                                )}
                                <ProgressiveImage
                                  src={photo.thumbnail}
                                  alt={photo.name}
                                  onLoadStart={() => handleImageLoadStart(photo.id)}
                                  onLoad={() => handleImageLoad(photo.id)}
                                  onError={() => handleImageLoad(photo.id)}
                                />
                              </>
                            )}
                            <div className="media-overlay">
                              <div className="media-actions">
                                <motion.button
                                  className="action-btn zoom-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLightbox(index, 'photo');
                                  }}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <RiZoomInLine />
                                </motion.button>
                                <motion.button
                                  className="action-btn download-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(photo.path, photo.name);
                                  }}
                                  disabled={downloading}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <RiDownloadLine />
                                </motion.button>
                              </div>
                              <p className="media-name">{photo.name}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Show More Button */}
                    {hasMoreToLoad && (
                      <div className="show-more-section">
                        <motion.button
                          className="show-more-btn"
                          onClick={loadMoreThumbnails}
                          disabled={loadingMoreThumbnails}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {loadingMoreThumbnails ? (
                            <>
                              <RiLoader4Line className="spinner" />
                              Loading More...
                            </>
                          ) : (
                            <>
                              <RiImageLine />
                              Show More Photos
                            </>
                          )}
                        </motion.button>
                        <p className="show-more-hint">
                          {media.photos.filter(p => p.needsLazyLoad || !p.thumbnail).length} more photos available
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Enhanced Lightbox */}
          <AnimatePresence>
            {selectedMedia && (
              <motion.div
                className="lightbox-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeLightbox}
              >
                <motion.div
                  className="lightbox-content"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Navigation */}
                  {lightboxIndex > 0 && (
                    <button 
                      className="nav-btn prev-btn"
                      onClick={() => navigateLightbox(-1)}
                    >
                      <RiArrowLeftSLine />
                    </button>
                  )}
                  
                  {lightboxIndex < [...filteredMedia.photos, ...filteredMedia.videos].length - 1 && (
                    <button 
                      className="nav-btn next-btn"
                      onClick={() => navigateLightbox(1)}
                    >
                      <RiArrowRightSLine />
                    </button>
                  )}

                  {/* Image */}
                  <div className="lightbox-image-container">
                    {selectedMedia.type === 'image' || !selectedMedia.type ? (
                      selectedMedia.thumbnail ? (
                        <img
                          src={selectedMedia.thumbnail}
                          alt={selectedMedia.name}
                          className="lightbox-image"
                        />
                      ) : (
                        <div className="lightbox-no-thumbnail">
                          <RiImageLine className="large-image-icon" />
                          <p>Full resolution image</p>
                          <motion.button 
                            className="view-full-btn"
                            onClick={() => handleDownload(selectedMedia.path, selectedMedia.name)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <RiDownloadLine /> Download to View
                          </motion.button>
                        </div>
                      )
                    ) : (
                      <div className="video-placeholder-large">
                        <RiVideoLine />
                        <p>Video preview not available</p>
                        <motion.button 
                          className="download-video-btn"
                          onClick={() => handleDownload(selectedMedia.path, selectedMedia.name)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <RiDownloadLine /> Download Video
                        </motion.button>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="lightbox-controls">
                    <div className="photo-counter">
                      {lightboxIndex + 1} / {[...filteredMedia.photos, ...filteredMedia.videos].length}
                    </div>
                    
                    <div className="lightbox-actions">
                      <motion.button
                        className="lightbox-download-btn"
                        onClick={() => handleDownload(selectedMedia.path, selectedMedia.name)}
                        disabled={downloading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <RiDownloadLine />
                        Download
                      </motion.button>
                      
                      <motion.button
                        className="lightbox-close-btn"
                        onClick={closeLightbox}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <RiCloseLine />
                        Close
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EventGallery;