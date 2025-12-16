import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(!!brandHasVideoGalleries);
  const [error, setError] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState("latest");
  const [availableGalleries, setAvailableGalleries] = useState([]);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Configuration
  const config = useMemo(
    () => ({
      INITIAL_LOAD_COUNT: 8, // Show first 8 videos in grid
    }),
    []
  );

  // Fetch video gallery
  const fetchVideoGallery = useCallback(
    async (eventId = "latest") => {
      if (!brandId && !brandUsername) {
        console.warn("VideoCarousel: No brandId or brandUsername provided");
        return;
      }

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
              `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
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

        const response = await axiosInstance.get(endpoint);

        if (
          response.data?.success &&
          response.data?.media?.videos &&
          Array.isArray(response.data.media.videos)
        ) {
          // Take only the first batch of videos
          const videoList = response.data.media.videos.slice(
            0,
            config.INITIAL_LOAD_COUNT
          );
          setVideos(videoList);
        } else {
          setVideos([]);
        }
      } catch (err) {
        console.error("VideoCarousel: Error fetching video gallery:", err);
        setError("Failed to load video gallery");
        setVideos([]);
      } finally {
        setLoading(false);
      }
    },
    [brandId, brandUsername, config.INITIAL_LOAD_COUNT]
  );

  // Fetch available video galleries (use video-specific dates endpoint)
  const fetchAvailableGalleries = useCallback(async () => {
    if (!brandId && !brandUsername) return;

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
        const response = await axiosInstance.get(endpoint);
        if (response.data?.galleryOptions) {
          setAvailableGalleries(response.data.galleryOptions);
        }
      }
    } catch (err) {
      console.error("VideoCarousel: Error fetching video gallery dates:", err);
    }
  }, [brandId, brandUsername]);

  // Initialize when component mounts
  useEffect(() => {
    if (brandHasVideoGalleries && (brandId || brandUsername)) {
      fetchVideoGallery(selectedEventId);
      fetchAvailableGalleries();
    } else {
      setLoading(false);
    }
  }, [
    brandHasVideoGalleries,
    brandId,
    brandUsername,
    selectedEventId,
    fetchVideoGallery,
    fetchAvailableGalleries,
  ]);

  // Handle video click
  const handleVideoClick = useCallback(
    (video, index) => {
      if (onVideoClick) {
        onVideoClick(videos, index);
      }
    },
    [onVideoClick, videos]
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

  // Format file size for display
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  }, []);

  // Filter galleries by search
  const filteredGalleries = useMemo(
    () =>
      availableGalleries.filter(
        (g) =>
          g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          formatDate(g.date).toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [availableGalleries, searchQuery, formatDate]
  );

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
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  // Check if we have videos
  const hasVideos = videos && videos.length > 0;

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
                <span>Browse Events</span>
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
                            <span className="item-title">Latest Videos</span>
                            <span className="item-sub">Most recent videos</span>
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
                              {formatDate(gallery.date)}
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

      {/* Video Grid OR Empty State */}
      {hasVideos ? (
        <div className="video-grid">
          {videos.map((video, index) => (
            <motion.div
              key={video.id || index}
              className="video-item"
              whileHover={{ scale: 1.03 }}
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
                {/* Video info overlay on thumbnail */}
                <div className="video-info-overlay">
                  <span className="overlay-name" title={video.name}>
                    {video.name}
                  </span>
                  <span className="overlay-size">{formatFileSize(video.size)}</span>
                </div>
              </div>
              <div className="video-info">
                <span className="video-name" title={video.name}>
                  {video.name}
                </span>
                <span className="video-size">{formatFileSize(video.size)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="video-empty">
          <RiFilmLine />
          <p>No videos available for this event</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(VideoCarousel);
