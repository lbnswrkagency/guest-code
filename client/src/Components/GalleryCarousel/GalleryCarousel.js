import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  const [selectedEventId, setSelectedEventId] = useState(currentEvent?._id || 'latest');
  const [availableGalleries, setAvailableGalleries] = useState([]);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const carouselRef = useRef(null);
  const autoPlayIntervalRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Configuration constants - memoized to prevent recreation
  const config = useMemo(() => ({
    VISIBLE_IMAGES: 4, // Number of images visible at once
    IMAGE_WIDTH: 280, // Width of each image
    IMAGE_GAP: 16, // Gap between images
    AUTO_SCROLL_DELAY: 3000, // 3 seconds
    INITIAL_LOAD_COUNT: 12, // Load first 12 images
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
      console.error("GalleryCarousel: Error fetching gallery:", err);
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

  // Memoize image click handler
  const handleImageClick = useCallback((image, index) => {
    if (onImageClick) {
      onImageClick(selectedEventId, index);
    }
  }, [onImageClick, selectedEventId]);

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

  // No images state
  if (!images || images.length === 0) {
    return null; // Don't show anything if no images
  }

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
          
          {/* Date selector */}
          {availableGalleries.length > 1 && (
            <div className="date-selector">
              <button
                className="date-selector-toggle"
                onClick={() => setShowDateSelector(!showDateSelector)}
              >
                <RiCalendarEventLine />
                <span>
                  {selectedEventId === 'latest' 
                    ? 'Latest Gallery' 
                    : availableGalleries.find(g => g.eventId === selectedEventId)?.title || 'Select Date'
                  }
                </span>
                <RiArrowDownSLine className={showDateSelector ? 'rotated' : ''} />
              </button>
              
              <AnimatePresence>
                {showDateSelector && (
                  <motion.div 
                    className="date-dropdown"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div 
                      className={`date-option ${selectedEventId === 'latest' ? 'active' : ''}`}
                      onClick={() => handleEventChange('latest')}
                    >
                      <span className="option-title">Latest Gallery</span>
                      <span className="option-date">Most Recent</span>
                    </div>
                    {availableGalleries.map((gallery) => (
                      <div
                        key={gallery.eventId}
                        className={`date-option ${selectedEventId === gallery.eventId ? 'active' : ''}`}
                        onClick={() => handleEventChange(gallery.eventId)}
                      >
                        <span className="option-title">{gallery.title}</span>
                        <span className="option-date">{formatDate(gallery.date)}</span>
                        <span className="option-count">{gallery.mediaCount} items</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};

// Memoize the entire component to prevent unnecessary re-renders from parent
export default React.memo(GalleryCarousel);