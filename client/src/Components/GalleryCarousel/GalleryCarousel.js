import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import "./GalleryCarousel.scss";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import {
  RiImageLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarEventLine,
  RiArrowDownSLine,
  RiLoader4Line,
  RiPlayCircleLine,
  RiPauseCircleLine,
} from "react-icons/ri";

// Memoize the LoadingSpinner component to prevent unnecessary renders
const LoadingSpinner = React.memo(({ size = "default", color = "#ffc807" }) => {
  const spinnerSize = size === "small" ? "16px" : "24px";
  return (
    <div
      className="gallery-spinner"
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
 * GalleryCarousel component for displaying event gallery images
 * @param {Object} props
 * @param {string} props.brandId - ID of the brand
 * @param {string} props.brandUsername - Username of the brand
 * @param {Object} props.currentEvent - Current event object
 * @param {Function} props.onImageClick - Callback for image click
 * @param {boolean} props.brandHasGalleries - Whether brand has galleries
 */
const GalleryCarousel = ({
  brandId,
  brandUsername,
  currentEvent,
  onImageClick,
  brandHasGalleries
}) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(!!brandHasGalleries); // Start with true only if galleries exist
  const [error, setError] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('latest');
  const [availableGalleries, setAvailableGalleries] = useState([]);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const carouselRef = useRef(null);
  const autoPlayIntervalRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Configuration constants - synced with CSS values
  const config = useMemo(() => ({
    VISIBLE_IMAGES: 4, // Number of images visible at once
    IMAGE_WIDTH: 240, // Width of each image (matches .carousel-item width in CSS)
    IMAGE_GAP: 12, // Gap between images (matches .carousel-track gap in CSS)
    AUTO_SCROLL_DELAY: 3000, // 3 seconds
    INITIAL_LOAD_COUNT: 10, // Load first 10 images
  }), []);

  // Memoize fetchGallery function to prevent recreation on each render
  const fetchGallery = useCallback(async (eventId = 'latest') => {
    if (!brandId && !brandUsername) {
      console.warn("GalleryCarousel: No brandId or brandUsername provided");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      
      if (eventId === 'latest') {
        // Get the latest gallery
        if (brandId) {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandId}/galleries/latest`;
        } else if (brandUsername) {
          // First get brand ID from username
          const cleanUsername = brandUsername.replace(/^@/, "");
          const brandResponse = await axiosInstance.get(
            `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
          );
          if (brandResponse.data && brandResponse.data._id) {
            endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandResponse.data._id}/galleries/latest`;
          }
        }
      } else {
        // Get specific event gallery
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/event/${eventId}/gallery`;
      }
      
      if (!endpoint) {
        throw new Error('Could not construct gallery endpoint');
      }
      
      const response = await axiosInstance.get(endpoint);

      if (response.data?.success && response.data?.media?.photos && Array.isArray(response.data.media.photos)) {
        // Take only the first batch of photos for carousel
        const photos = response.data.media.photos.slice(0, config.INITIAL_LOAD_COUNT);
        setImages(photos);
        setCurrentIndex(0); // Reset to first image
      } else {
        setImages([]);
      }
    } catch (err) {
      console.error("🖼️ [GalleryCarousel] Error fetching gallery:", err);
      setError("Failed to load gallery");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, brandUsername, config.INITIAL_LOAD_COUNT]);

  // Memoize fetchAvailableGalleries function
  const fetchAvailableGalleries = useCallback(async () => {
    if (!brandId && !brandUsername) return;
    
    try {
      let endpoint = '';
      
      if (brandId) {
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandId}/galleries/dates`;
      } else if (brandUsername) {
        // First get brand ID from username
        const cleanUsername = brandUsername.replace(/^@/, "");
        const brandResponse = await axiosInstance.get(
          `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
        );
        if (brandResponse.data?._id) {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandResponse.data._id}/galleries/dates`;
        }
      }
      
      if (endpoint) {
        const response = await axiosInstance.get(endpoint);
        if (response.data?.galleryOptions) {
          setAvailableGalleries(response.data.galleryOptions);
        }
      }
    } catch (err) {
      console.error("GalleryCarousel: Error fetching gallery dates:", err);
    }
  }, [brandId, brandUsername]);

  // Initialize gallery when component mounts or dependencies change
  useEffect(() => {
    if (brandHasGalleries && (brandId || brandUsername)) {
      fetchGallery(selectedEventId);
      fetchAvailableGalleries();
    } else {
      setLoading(false);
    }
  }, [brandHasGalleries, brandId, brandUsername, selectedEventId, fetchGallery, fetchAvailableGalleries]);

  // Auto-scroll functionality with proper cleanup
  useEffect(() => {
    if (!isAutoPlaying || images.length <= config.VISIBLE_IMAGES || loading) {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
      return;
    }

    autoPlayIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const maxIndex = Math.max(0, images.length - config.VISIBLE_IMAGES);
        return prevIndex >= maxIndex ? 0 : prevIndex + 1;
      });
    }, config.AUTO_SCROLL_DELAY);

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying, images.length, loading, config.VISIBLE_IMAGES, config.AUTO_SCROLL_DELAY]);

  // Memoize navigation handlers to prevent recreation on each render
  const handlePrevious = useCallback(() => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    
    // Resume auto-play after 5 seconds
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 5000);
  }, []);

  const handleNext = useCallback(() => {
    setIsAutoPlaying(false);
    const maxIndex = Math.max(0, images.length - config.VISIBLE_IMAGES);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
    
    // Resume auto-play after 5 seconds
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 5000);
  }, [images.length, config.VISIBLE_IMAGES]);

  // Memoize image click handler - pass images array and clicked index
  const handleImageClick = useCallback((image, index) => {
    if (onImageClick) {
      onImageClick(images, index);
    }
  }, [onImageClick, images]);

  // Memoize event change handler
  const handleEventChange = useCallback((eventId) => {
    setSelectedEventId(eventId);
    setShowDateSelector(false);
    fetchGallery(eventId);
  }, [fetchGallery]);

  // Memoize date formatting function
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }, []);

  // Memoize computed values
  const maxIndex = useMemo(() =>
    Math.max(0, images.length - config.VISIBLE_IMAGES),
    [images.length, config.VISIBLE_IMAGES]
  );

  const showNavigation = useMemo(() =>
    images.length > config.VISIBLE_IMAGES,
    [images.length, config.VISIBLE_IMAGES]
  );

  // Filter galleries by search query
  const filteredGalleries = useMemo(() =>
    availableGalleries.filter(g =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatDate(g.date).toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [availableGalleries, searchQuery, formatDate]
  );

  // Don't render if no galleries
  if (!brandHasGalleries) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="gallery-carousel loading">
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  // Check if we have images to show
  const hasImages = images && images.length > 0;

  return (
    <div className="gallery-carousel">
      <div className="gallery-header">
        <h3 className="gallery-title">
          <RiImageLine />
          Event Gallery
        </h3>
        
        <div className="gallery-controls">
          {/* Auto-play toggle */}
          {showNavigation && (
            <button
              className="auto-play-toggle"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              title={isAutoPlaying ? "Pause auto-scroll" : "Play auto-scroll"}
            >
              {isAutoPlaying ? <RiPauseCircleLine /> : <RiPlayCircleLine />}
            </button>
          )}
          
          {/* Date selector - Browse Events */}
          {availableGalleries.length >= 1 && (
            <div className="date-selector">
              <button
                className="date-selector-toggle"
                onClick={() => setShowDateSelector(!showDateSelector)}
              >
                <RiCalendarEventLine />
                <span>Browse Events</span>
                <RiArrowDownSLine className={showDateSelector ? 'rotated' : ''} />
              </button>

              {/* Modal rendered via Portal */}
              {showDateSelector && createPortal(
                <div className="gallery-picker-overlay" onClick={() => { setShowDateSelector(false); setSearchQuery(''); }}>
                  <div className="gallery-picker" onClick={(e) => e.stopPropagation()}>
                    <div className="picker-header">
                      <h4>Browse Galleries</h4>
                      <button className="picker-close" onClick={() => { setShowDateSelector(false); setSearchQuery(''); }}>
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
                          className={`picker-item featured ${selectedEventId === 'latest' ? 'active' : ''}`}
                          onClick={() => handleEventChange('latest')}
                        >
                          <span className="item-title">Latest Gallery</span>
                          <span className="item-sub">Most recent photos</span>
                        </div>
                      )}

                      {/* Event Galleries */}
                      {filteredGalleries.map((gallery) => (
                        <div
                          key={gallery.eventId}
                          className={`picker-item ${selectedEventId === gallery.eventId ? 'active' : ''}`}
                          onClick={() => handleEventChange(gallery.eventId)}
                        >
                          <span className="item-title">{gallery.title}</span>
                          <span className="item-sub">{formatDate(gallery.date)} · {gallery.mediaCount} photos</span>
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

      {/* Show carousel OR empty state */}
      {hasImages ? (
        <>
          <div className="gallery-carousel-container">
            {/* Navigation buttons */}
            {showNavigation && (
              <button
                className={`nav-button nav-prev ${currentIndex === 0 ? 'disabled' : ''}`}
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <RiArrowLeftSLine />
              </button>
            )}

            {/* Images container */}
            <div className="carousel-viewport">
              <motion.div
                className="carousel-track"
                animate={{
                  x: -currentIndex * (config.IMAGE_WIDTH + config.IMAGE_GAP)
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              >
                {images.map((image, index) => (
                  <motion.div
                    key={image.id || index}
                    className="carousel-item"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleImageClick(image, index)}
                  >
                    {image.thumbnail ? (
                      <img
                        src={image.thumbnail}
                        alt={image.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="image-placeholder">
                        <RiImageLine />
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Navigation buttons */}
            {showNavigation && (
              <button
                className={`nav-button nav-next ${currentIndex >= maxIndex ? 'disabled' : ''}`}
                onClick={handleNext}
                disabled={currentIndex >= maxIndex}
              >
                <RiArrowRightSLine />
              </button>
            )}
          </div>

          {/* Progress dots */}
          {showNavigation && (
            <div className="carousel-dots">
              {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                <div
                  key={index}
                  className={`dot ${currentIndex === index ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsAutoPlaying(false);
                    clearTimeout(scrollTimeoutRef.current);
                    scrollTimeoutRef.current = setTimeout(() => {
                      setIsAutoPlaying(true);
                    }, 5000);
                  }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="gallery-empty">
          <RiImageLine />
          <p>No images available for this event</p>
        </div>
      )}
    </div>
  );
};

// Memoize the entire component to prevent unnecessary re-renders from parent
export default React.memo(GalleryCarousel);