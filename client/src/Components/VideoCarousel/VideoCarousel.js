import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import "./VideoCarousel.scss";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import {
  RiFilmLine,
  RiPlayCircleLine,
  RiCalendarEventLine,
  RiArrowDownSLine,
  RiLoader4Line,
} from "react-icons/ri";

// Memoize the LoadingSpinner component
const LoadingSpinner = React.memo(({ size = "default", color = "#ffc807" }) => {
  const spinnerSize = size === "small" ? "16px" : "24px";
  return (
    <div
      className="video-gallery-spinner"
      style={{
        width: spinnerSize,
        height: spinnerSize,
        borderColor: `${color}40`,
        borderTopColor: color,
      }}
    ></div>
  );
});

/**
 * VideoCarousel component for displaying event gallery videos
 * @param {Object} props
 * @param {string} props.brandId - ID of the brand
 * @param {string} props.brandUsername - Username of the brand
 * @param {Function} props.onVideoClick - Callback for video click (opens VideoGallery)
 * @param {boolean} props.brandHasVideoGalleries - Whether brand has video galleries
 */
const VideoCarousel = ({
  brandId,
  brandUsername,
  onVideoClick,
  brandHasVideoGalleries,
}) => {
  const [videos, setVideos] = useState([]); // Sliced videos for carousel display
  const [allVideos, setAllVideos] = useState([]); // ALL videos for lightbox browsing
  const [loading, setLoading] = useState(!!brandHasVideoGalleries);
  const [error, setError] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState("latest");
  const [availableGalleries, setAvailableGalleries] = useState([]);
  const [currentGalleryInfo, setCurrentGalleryInfo] = useState(null); // Store actual latest gallery info
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Refs for request cancellation and race condition prevention
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const isInitializedRef = useRef(false);

  // Configuration
  const config = useMemo(
    () => ({
      INITIAL_LOAD_COUNT: 8, // Show first 8 videos in grid
    }),
    []
  );

  // Fetch video gallery with race condition protection
  const fetchVideoGallery = useCallback(
    async (eventId = "latest", forceRefresh = false) => {
      if (!brandId && !brandUsername) {
        console.warn("🎬 [VideoCarousel] No brandId or brandUsername provided");
        return;
      }

      // Prevent multiple simultaneous requests for the same eventId
      const currentRequestId = ++requestIdRef.current;
      
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      console.log(`🚀 [VideoCarousel] [Request-${currentRequestId}] Fetching video gallery for eventId:`, eventId);
      setLoading(true);
      setError(null);

      try {
        let endpoint = "";

        if (eventId === "latest") {
          // Get the latest video gallery
          if (brandId) {
            endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandId}/videos/latest`;
          } else if (brandUsername) {
            // First get brand ID from username
            const cleanUsername = brandUsername.replace(/^@/, "");
            const brandResponse = await axiosInstance.get(
              `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`,
              { signal: abortControllerRef.current.signal }
            );
            if (brandResponse.data && brandResponse.data._id) {
              endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandResponse.data._id}/videos/latest`;
            }
          }
        } else {
          // Get specific event video gallery
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/event/${eventId}/video-gallery`;
        }

        if (!endpoint) {
          throw new Error("Could not construct video gallery endpoint");
        }

        console.log(`🔍 [VideoCarousel] [Request-${currentRequestId}] Calling endpoint:`, endpoint);
        const response = await axiosInstance.get(endpoint, { 
          signal: abortControllerRef.current.signal 
        });

        // Check if this request is still the latest one
        if (currentRequestId !== requestIdRef.current) {
          console.log(`⏭️ [VideoCarousel] [Request-${currentRequestId}] Request outdated, ignoring response`);
          return;
        }

        console.log(`✅ [VideoCarousel] [Request-${currentRequestId}] Response received:`, response.data);

        if (
          response.data?.success &&
          response.data?.media?.videos &&
          Array.isArray(response.data.media.videos) &&
          response.data.media.videos.length > 0
        ) {
          // Store ALL videos for lightbox browsing
          const allVideosList = response.data.media.videos;
          setAllVideos(allVideosList);

          // Take only the first batch of videos for carousel display
          const videoList = allVideosList.slice(
            0,
            config.INITIAL_LOAD_COUNT
          );
          console.log("📹 [VideoCarousel] Setting videos:", videoList.length, "of", allVideosList.length, "total videos");
          setVideos(videoList);
          
          // Store current gallery info for display
          if (eventId === "latest") {
            // First try to get info from API response
            if (response.data?.galleryInfo) {
              console.log("📊 [VideoCarousel] Using galleryInfo from API:", response.data.galleryInfo);
              setCurrentGalleryInfo({
                title: response.data.galleryInfo.title || "Latest Video Gallery",
                date: response.data.galleryInfo.date,
                mediaCount: response.data.media.videos.length
              });
            } else if (availableGalleries.length > 0) {
              // Fallback: use the first (most recent) gallery from available galleries
              const sortedGalleries = [...availableGalleries].sort((a, b) => 
                new Date(b.date) - new Date(a.date)
              );
              const latestGallery = sortedGalleries[0];
              console.log("📊 [VideoCarousel] Using fallback latest gallery:", latestGallery);
              setCurrentGalleryInfo({
                title: latestGallery.title,
                date: latestGallery.date,
                mediaCount: response.data.media.videos.length
              });
            }
          } else if (eventId !== "latest") {
            // For specific event, find it in available galleries
            const galleryInfo = availableGalleries.find(g => g.eventId === eventId);
            if (galleryInfo) {
              setCurrentGalleryInfo(galleryInfo);
            }
          }
        } else {
          console.log(`❌ [VideoCarousel] [Request-${currentRequestId}] No videos found in response - API returned empty array or no success`);
          setVideos([]);
          setAllVideos([]);
          setCurrentGalleryInfo(null);
        }
      } catch (err) {
        // Check if this request was cancelled
        if (currentRequestId !== requestIdRef.current) {
          console.log(`⏭️ [VideoCarousel] [Request-${currentRequestId}] Request cancelled, ignoring error`);
          return;
        }

        if (err.name === 'AbortError') {
          console.log(`🚫 [VideoCarousel] [Request-${currentRequestId}] Request aborted`);
          return;
        }

        console.error(`❌ [VideoCarousel] [Request-${currentRequestId}] Error fetching video gallery:`, err);
        setError("Failed to load video gallery");
        setVideos([]);
        setAllVideos([]);
        setCurrentGalleryInfo(null);
      } finally {
        // Only update loading state if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [brandId, brandUsername, config.INITIAL_LOAD_COUNT, availableGalleries]
  );

  // Fetch available video galleries (use video-specific dates endpoint)
  const fetchAvailableGalleries = useCallback(async () => {
    if (!brandId && !brandUsername) return;

    console.log("🗓️ [VideoCarousel] Fetching available video galleries...");
    try {
      let endpoint = "";

      if (brandId) {
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandId}/videos/dates`;
      } else if (brandUsername) {
        const cleanUsername = brandUsername.replace(/^@/, "");
        const brandResponse = await axiosInstance.get(
          `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
        );
        if (brandResponse.data?._id) {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandResponse.data._id}/videos/dates`;
        }
      }

      if (endpoint) {
        console.log("🔍 [VideoCarousel] Fetching from:", endpoint);
        const response = await axiosInstance.get(endpoint);
        console.log("📅 [VideoCarousel] Available galleries response:", response.data);
        
        if (response.data?.galleryOptions) {
          console.log("📋 [VideoCarousel] Setting available galleries:", response.data.galleryOptions.length);
          setAvailableGalleries(response.data.galleryOptions);
        } else {
          console.log("❌ [VideoCarousel] No gallery options in response");
        }
      }
    } catch (err) {
      console.error("❌ [VideoCarousel] Error fetching video gallery dates:", err);
    }
  }, [brandId, brandUsername]);

  // Consolidated initialization and update effect
  useEffect(() => {
    const initializeOrUpdate = async () => {
      if (!brandHasVideoGalleries || (!brandId && !brandUsername)) {
        setLoading(false);
        setVideos([]);
        setCurrentGalleryInfo(null);
        return;
      }

      // First time initialization
      if (!isInitializedRef.current) {
        console.log("🔄 [VideoCarousel] Initial setup - fetching available galleries first");
        await fetchAvailableGalleries();
        isInitializedRef.current = true;
        
        // After fetching galleries, check if we need to auto-select a different event
        // This will be handled in the separate effect below
        return;
      }

      // Fetch videos for selected event
      fetchVideoGallery(selectedEventId);
    };

    initializeOrUpdate();
  }, [brandHasVideoGalleries, brandId, brandUsername, selectedEventId, fetchVideoGallery, fetchAvailableGalleries]);

  // Smart gallery selection effect - runs after availableGalleries are loaded
  useEffect(() => {
    const handleSmartSelection = async () => {
      // Only run this logic when:
      // 1. Available galleries have been loaded
      // 2. Currently on "latest" selection 
      // 3. Component is initialized
      if (availableGalleries.length > 0 && selectedEventId === "latest" && isInitializedRef.current) {
        console.log("🎯 [VideoCarousel] Smart selection - checking if latest needs fallback");
        
        // First try to get latest videos
        try {
          let endpoint = "";
          if (brandId) {
            endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandId}/videos/latest`;
          } else if (brandUsername) {
            const cleanUsername = brandUsername.replace(/^@/, "");
            const brandResponse = await axiosInstance.get(
              `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
            );
            if (brandResponse.data?._id) {
              endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandResponse.data._id}/videos/latest`;
            }
          }

          if (endpoint) {
            const response = await axiosInstance.get(endpoint);
            const hasActualLatestVideos = response.data?.success && 
                                         response.data?.media?.videos &&
                                         response.data.media.videos.length > 0;

            if (!hasActualLatestVideos) {
              // Latest is empty, auto-select the most recent available gallery
              const sortedGalleries = [...availableGalleries].sort((a, b) => 
                new Date(b.date) - new Date(a.date)
              );
              const actualLatestGallery = sortedGalleries[0];
              
              if (actualLatestGallery) {
                console.log("🔄 [VideoCarousel] Auto-selecting actual latest gallery:", actualLatestGallery);
                setSelectedEventId(actualLatestGallery.eventId);
                setCurrentGalleryInfo({
                  title: actualLatestGallery.title,
                  date: actualLatestGallery.date,
                  mediaCount: actualLatestGallery.mediaCount
                });
                return; // Don't fetch again, the selectedEventId change will trigger the other effect
              }
            }
          }
        } catch (error) {
          console.log("🔍 [VideoCarousel] Latest check failed, will fallback in main fetch");
        }
        
        // If we reach here, either latest has videos or fallback failed
        // Let the main effect handle the fetch
      }
    };

    handleSmartSelection();
  }, [availableGalleries, selectedEventId, brandId, brandUsername]);

  // Cleanup effect - cancel any pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle video click - pass ALL videos for lightbox browsing
  const handleVideoClick = useCallback(
    (video, index) => {
      if (onVideoClick) {
        // Pass allVideos so lightbox can browse ALL videos, not just carousel subset
        onVideoClick(allVideos, index);
      }
    },
    [onVideoClick, allVideos]
  );

  // Handle event selection change
  const handleEventChange = useCallback(
    (eventId) => {
      setSelectedEventId(eventId);
      setShowDateSelector(false);
      fetchVideoGallery(eventId);
    },
    [fetchVideoGallery]
  );

  // Format date for display
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  // Format date with day name for display
  const formatDateWithDay = useCallback((dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  // Enhanced search matching function
  const matchesSearch = useCallback((gallery, query) => {
    if (!query) return true;
    
    const searchLower = query.toLowerCase().trim();
    const title = gallery.title?.toLowerCase() || "";
    
    // Basic title matching
    if (title.includes(searchLower)) return true;
    
    // Date parsing and matching
    if (gallery.date) {
      const date = new Date(gallery.date);
      const day = date.getDate();
      const month = date.getMonth() + 1; // JS months are 0-indexed
      const year = date.getFullYear();
      
      // Month names (full and short)
      const monthNames = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ];
      const shortMonthNames = [
        "jan", "feb", "mar", "apr", "may", "jun",
        "jul", "aug", "sep", "oct", "nov", "dec"
      ];
      
      const monthName = monthNames[month - 1];
      const shortMonthName = shortMonthNames[month - 1];
      
      // Format variations to check
      const dateFormats = [
        `${day}.${month}.${year}`,         // 12.10.2025
        `${day}.${month}`,                 // 12.10
        `${day}/${month}/${year}`,         // 12/10/2025
        `${day}/${month}`,                 // 12/10
        `${day}-${month}-${year}`,         // 12-10-2025
        `${day}-${month}`,                 // 12-10
        `${monthName} ${day}`,             // october 12
        `${day} ${monthName}`,             // 12 october
        `${shortMonthName} ${day}`,        // oct 12
        `${day} ${shortMonthName}`,        // 12 oct
        formatDate(gallery.date).toLowerCase(), // formatted date from function
        formatDateWithDay(gallery.date).toLowerCase() // formatted date with day
      ];
      
      // Check all date format variations
      if (dateFormats.some(format => format.includes(searchLower))) {
        return true;
      }
      
      // Partial month name matching (e.g., "octo" matches "october")
      if (monthName.includes(searchLower) || shortMonthName.includes(searchLower)) {
        return true;
      }
      
      // Year matching
      if (year.toString().includes(searchLower)) {
        return true;
      }
    }
    
    return false;
  }, [formatDate, formatDateWithDay]);

  // Format file size for display
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  }, []);

  // Filter galleries by enhanced search
  const filteredGalleries = useMemo(
    () => availableGalleries.filter(gallery => matchesSearch(gallery, searchQuery)),
    [availableGalleries, searchQuery, matchesSearch]
  );

  // Get current selection display text
  const currentSelectionText = useMemo(() => {
    if (selectedEventId === "latest") {
      if (currentGalleryInfo) {
        return `${currentGalleryInfo.title} • ${formatDate(currentGalleryInfo.date)}`;
      }
      return "Latest Videos";
    }
    const selectedGallery = availableGalleries.find(
      (g) => g.eventId === selectedEventId
    );
    if (selectedGallery) {
      return `${selectedGallery.title} • ${formatDate(selectedGallery.date)}`;
    }
    return "Browse Events";
  }, [selectedEventId, availableGalleries, currentGalleryInfo, formatDate]);

  // Don't render if no video galleries
  if (!brandHasVideoGalleries) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="video-carousel loading">
        <div className="loading-container">
          <LoadingSpinner />
          <p>✨ Loading original quality • Worth the wait</p>
        </div>
      </div>
    );
  }

  // Check if we have videos
  const hasVideos = videos && videos.length > 0;

  // Only return null if no video galleries exist at all
  // If galleries exist but no videos, show empty state
  const shouldShowComponent = brandHasVideoGalleries || availableGalleries.length > 0 || hasVideos;

  if (!shouldShowComponent) {
    return null;
  }

  return (
    <div className="video-carousel">
      <div className="video-header">
        <h3 className="video-title">
          <RiFilmLine />
          Video Gallery
        </h3>

        <div className="video-controls">
          {/* Date selector - Browse Events */}
          {availableGalleries.length >= 1 && (
            <div className="date-selector">
              <button
                className="date-selector-toggle"
                onClick={() => setShowDateSelector(!showDateSelector)}
              >
                <RiCalendarEventLine />
                <span>{currentSelectionText}</span>
                <RiArrowDownSLine
                  className={showDateSelector ? "rotated" : ""}
                />
              </button>

              {/* Modal rendered via Portal */}
              {showDateSelector &&
                createPortal(
                  <div
                    className="video-picker-overlay"
                    onClick={() => {
                      setShowDateSelector(false);
                      setSearchQuery("");
                    }}
                  >
                    <div
                      className="video-picker"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="picker-header">
                        <h4>Browse Video Galleries</h4>
                        <button
                          className="picker-close"
                          onClick={() => {
                            setShowDateSelector(false);
                            setSearchQuery("");
                          }}
                        >
                          ×
                        </button>
                      </div>

                      <div className="picker-list">
                        {/* Search Input */}
                        <input
                          type="text"
                          placeholder="Search events..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="picker-search"
                          autoFocus
                        />

                        {/* Latest Gallery */}
                        {!searchQuery && (
                          <div
                            className={`picker-item featured ${
                              selectedEventId === "latest" ? "active" : ""
                            }`}
                            onClick={() => handleEventChange("latest")}
                          >
                            <span className="item-title">
                              {currentGalleryInfo ? currentGalleryInfo.title : "Latest Videos"}
                            </span>
                            <span className="item-sub">
                              {currentGalleryInfo 
                                ? `${formatDate(currentGalleryInfo.date)} • ${currentGalleryInfo.mediaCount} videos`
                                : "Most recent videos"
                              }
                            </span>
                          </div>
                        )}

                        {/* Event Galleries */}
                        {filteredGalleries.map((gallery) => (
                          <div
                            key={gallery.eventId}
                            className={`picker-item ${
                              selectedEventId === gallery.eventId
                                ? "active"
                                : ""
                            }`}
                            onClick={() => handleEventChange(gallery.eventId)}
                          >
                            <span className="item-title">{gallery.title}</span>
                            <span className="item-sub">
                              {formatDate(gallery.date)} • {gallery.mediaCount} videos
                            </span>
                          </div>
                        ))}

                        {/* No results */}
                        {searchQuery && filteredGalleries.length === 0 && (
                          <div className="picker-empty">No events found</div>
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
            </div>
          )}
        </div>
      </div>

      {/* Video Grid or Empty State */}
      {hasVideos ? (
        <div className="video-grid">
          {videos.map((video, index) => (
            <motion.div
              key={video.id || index}
              className="video-item"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleVideoClick(video, index)}
            >
              <div className={`video-thumbnail ${video.thumbnail ? 'has-thumbnail' : ''}`}>
                {/* Show actual thumbnail if available */}
                {video.thumbnail ? (
                  <>
                    <img
                      src={video.thumbnail}
                      alt={video.name}
                      className="thumbnail-image"
                      loading="lazy"
                    />
                    <div className="play-button-overlay">
                      <RiPlayCircleLine className="play-overlay" />
                    </div>
                  </>
                ) : (
                  /* Video placeholder with play icon when no thumbnail */
                  <div className="video-placeholder">
                    <RiFilmLine className="video-icon" />
                    <RiPlayCircleLine className="play-overlay" />
                  </div>
                )}
                {/* Removed overlay info for cleaner, minimalistic look */}
              </div>
              <div className="video-info">
                <span className="video-name" title={video.name}>
                  {video.name.replace(/\.[^/.]+$/, "")} {/* Remove file extension */}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty state when galleries exist but no videos are available */
        <div className="video-empty">
          <RiFilmLine />
          <p>No videos available for this event</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(VideoCarousel);
