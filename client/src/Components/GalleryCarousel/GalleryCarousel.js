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
 * @param {Function} props.onGalleryStatusChange - Callback to report actual gallery status
 */
const GalleryCarousel = ({
  brandId,
  brandUsername,
  currentEvent,
  onImageClick,
  brandHasGalleries,
  onGalleryStatusChange
}) => {
  const [images, setImages] = useState([]); // Sliced images for carousel display
  const [allImages, setAllImages] = useState([]); // ALL images for lightbox browsing
  const [loading, setLoading] = useState(!!brandHasGalleries); // Start with true only if galleries exist
  const [error, setError] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('latest');
  const [availableGalleries, setAvailableGalleries] = useState([]);
  const [currentGalleryInfo, setCurrentGalleryInfo] = useState(null); // Store actual latest gallery info
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const carouselRef = useRef(null);
  const autoPlayIntervalRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false); // Track if initial fetch is complete to prevent double fetching

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
        // Store ALL photos for lightbox browsing
        const allPhotos = response.data.media.photos;
        setAllImages(allPhotos);

        // Take only the first batch of photos for carousel display
        const photos = allPhotos.slice(0, config.INITIAL_LOAD_COUNT);
        setImages(photos);
        setCurrentIndex(0); // Reset to first image
        
        // Store current gallery info for display
        if (eventId === 'latest') {
          // First try to get info from API response
          if (response.data?.galleryInfo) {
            setCurrentGalleryInfo({
              title: response.data.galleryInfo.title || 'Latest Gallery',
              date: response.data.galleryInfo.date,
              mediaCount: response.data.media.photos.length
            });
          } else if (availableGalleries.length > 0) {
            // Fallback: use the first (most recent) gallery from available galleries
            const sortedGalleries = [...availableGalleries].sort((a, b) => 
              new Date(b.date) - new Date(a.date)
            );
            const latestGallery = sortedGalleries[0];
            setCurrentGalleryInfo({
              title: latestGallery.title,
              date: latestGallery.date,
              mediaCount: response.data.media.photos.length
            });
          }
        } else if (eventId !== 'latest') {
          // For specific event, find it in available galleries
          const galleryInfo = availableGalleries.find(g => g.eventId === eventId);
          if (galleryInfo) {
            setCurrentGalleryInfo(galleryInfo);
          }
        }
      } else {
        setImages([]);
        setAllImages([]);
        setCurrentGalleryInfo(null);
      }
    } catch (err) {
      console.error("🖼️ [GalleryCarousel] Error fetching gallery:", err);
      setError("Failed to load gallery");
      setImages([]);
      setAllImages([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, brandUsername, config.INITIAL_LOAD_COUNT, availableGalleries]);

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

  // Initialize gallery when component mounts - consolidated to prevent double fetching
  useEffect(() => {
    // Skip if already initialized or no gallery data expected
    if (isInitializedRef.current) return;

    if (!brandHasGalleries || (!brandId && !brandUsername)) {
      setLoading(false);
      // Report no galleries if callback exists
      if (onGalleryStatusChange) {
        onGalleryStatusChange(false);
      }
      return;
    }

    const initialize = async () => {
      try {
        await fetchAvailableGalleries();
        await fetchGallery(selectedEventId);
        isInitializedRef.current = true;
      } catch (err) {
        console.error("GalleryCarousel: Error during initialization:", err);
        setLoading(false);
        if (onGalleryStatusChange) {
          onGalleryStatusChange(false);
        }
      }
    };

    initialize();
  }, [brandHasGalleries, brandId, brandUsername, fetchAvailableGalleries, fetchGallery, selectedEventId, onGalleryStatusChange]);

  // Handle selectedEventId changes ONLY after initialization (user selection)
  useEffect(() => {
    // Only fetch if initialized and user explicitly changed the event (not 'latest')
    if (isInitializedRef.current && selectedEventId !== 'latest' && availableGalleries.length > 0) {
      fetchGallery(selectedEventId);
    }
  }, [selectedEventId, fetchGallery, availableGalleries.length]);

  // Report actual gallery status to parent after loading completes
  useEffect(() => {
    if (!loading && onGalleryStatusChange) {
      onGalleryStatusChange(images.length > 0);
    }
  }, [loading, images.length, onGalleryStatusChange]);

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

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Memoize image click handler - pass ALL images for lightbox browsing
  const handleImageClick = useCallback((image, index) => {
    if (onImageClick) {
      // Pass allImages so lightbox can browse ALL photos, not just carousel subset
      onImageClick(allImages, index);
    }
  }, [onImageClick, allImages]);

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

  // Format date with day name for display
  const formatDateWithDay = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // Enhanced search matching function (same as VideoCarousel)
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

  // Memoize computed values
  const maxIndex = useMemo(() =>
    Math.max(0, images.length - config.VISIBLE_IMAGES),
    [images.length, config.VISIBLE_IMAGES]
  );

  const showNavigation = useMemo(() =>
    images.length > config.VISIBLE_IMAGES,
    [images.length, config.VISIBLE_IMAGES]
  );

  // Filter galleries by enhanced search
  const filteredGalleries = useMemo(() => 
    availableGalleries.filter(gallery => matchesSearch(gallery, searchQuery)),
    [availableGalleries, searchQuery, matchesSearch]
  );

  // Get current selection display text
  const currentSelectionText = useMemo(() => {
    // Check if we're on a small screen
    const isSmallScreen = windowWidth <= 600;
    
    if (selectedEventId === 'latest') {
      if (currentGalleryInfo) {
        // Show only date on small screens
        return isSmallScreen 
          ? formatDate(currentGalleryInfo.date)
          : `${currentGalleryInfo.title} • ${formatDate(currentGalleryInfo.date)}`;
      }
      return 'Latest Photos';
    }
    const selectedGallery = availableGalleries.find(
      g => g.eventId === selectedEventId
    );
    if (selectedGallery) {
      // Show only date on small screens
      return isSmallScreen 
        ? formatDate(selectedGallery.date)
        : `${selectedGallery.title} • ${formatDate(selectedGallery.date)}`;
    }
    return 'Browse Events';
  }, [selectedEventId, availableGalleries, currentGalleryInfo, formatDate, windowWidth]);

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
          <p>✨ Loading original quality • Worth the wait</p>
        </div>
      </div>
    );
  }

  // Check if we have images to show
  const hasImages = images && images.length > 0;

  // Don't render anything if no images are available after loading
  if (!loading && !hasImages) {
    return null;
  }

  return (
    <div className="gallery-carousel">
      <div className="gallery-header">
        <h3 className="gallery-title">
          <RiImageLine />
          Photo Gallery
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
                <span>{currentSelectionText}</span>
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
                          <span className="item-title">
                            {currentGalleryInfo ? currentGalleryInfo.title : 'Latest Gallery'}
                          </span>
                          <span className="item-sub">
                            {currentGalleryInfo 
                              ? `${formatDate(currentGalleryInfo.date)} • ${currentGalleryInfo.mediaCount} photos`
                              : 'Most recent photos'
                            }
                          </span>
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

      {/* Show carousel (empty state handled above by returning null) */}
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

      {/* Progress dots - moved outside carousel container for proper centering */}
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