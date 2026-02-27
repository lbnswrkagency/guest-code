import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import "./EventGallery.scss";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiLoader4Line,
  RiImageLine,
} from "react-icons/ri";

const EventGallery = ({
  images = [],
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const { showSuccess, showError } = useToast();
  const containerRef = useRef(null);

  // Cache for temporary links - persists across navigation
  const [linkCache, setLinkCache] = useState({});
  // Track which images are currently being fetched
  const fetchingRef = useRef(new Set());

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Ref to access linkCache without triggering re-renders
  const linkCacheRef = useRef(linkCache);
  linkCacheRef.current = linkCache;

  // Fetch temporary link for an image (returns direct Dropbox CDN URL)
  const fetchTempLink = useCallback(async (image) => {
    if (!image?.path) return image?.thumbnail || null;

    const cacheKey = image.path;

    // Check cache first (use ref to avoid dependency)
    if (linkCacheRef.current[cacheKey]) {
      return linkCacheRef.current[cacheKey];
    }

    // Check if already fetching
    if (fetchingRef.current.has(cacheKey)) {
      return null; // Will be handled when fetch completes
    }

    fetchingRef.current.add(cacheKey);

    try {
      const response = await axiosInstance.get(
        `/dropbox/temp-link/${encodeURIComponent(image.path)}`
      );

      if (response.data?.success && response.data?.url) {
        const url = response.data.url;
        // Update cache
        setLinkCache(prev => ({ ...prev, [cacheKey]: url }));
        fetchingRef.current.delete(cacheKey);
        return url;
      }
    } catch (err) {
      console.error("Failed to get temp link:", err);
      fetchingRef.current.delete(cacheKey);
    }

    // Fallback to thumbnail
    return image?.thumbnail || null;
  }, []); // No dependencies - uses refs

  // Preload adjacent images
  const preloadAdjacentImages = useCallback((centerIndex) => {
    if (images.length === 0) return;

    // Preload: next 2, previous 1 (current is handled separately)
    const preloadIndexes = [
      centerIndex + 1,
      centerIndex + 2,
      centerIndex - 1
    ].filter(i => i >= 0 && i < images.length);

    // Fetch temp links for all and preload in browser
    for (const idx of preloadIndexes) {
      const image = images[idx];
      if (!image?.path) continue;

      const cacheKey = image.path;
      // Use ref to check cache without dependency
      if (linkCacheRef.current[cacheKey] || fetchingRef.current.has(cacheKey)) continue;

      // Fetch in background (don't await)
      fetchTempLink(image).then(url => {
        if (url) {
          // Preload in browser
          const img = new Image();
          img.src = url;
        }
      });
    }
  }, [images, fetchTempLink]);

  // Reset index only when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setImageLoading(true);
    }
  }, [isOpen, initialIndex]);

  // Load current image and preload adjacent when index changes
  useEffect(() => {
    if (!isOpen || images.length === 0) return;

    const currentImage = images[currentIndex];
    if (!currentImage?.path) {
      setImageLoading(false);
      return;
    }

    // Check cache first - if cached, don't show loading (image will load from browser cache)
    const cacheKey = currentImage.path;
    const isCached = !!linkCacheRef.current[cacheKey];

    if (!isCached) {
      // Only show loading if we need to fetch
      setImageLoading(true);
      // Fetch the temp link
      fetchTempLink(currentImage);
    }
    // If cached, imageLoading will be set to false by onLoad handler

    // Preload adjacent images in background
    preloadAdjacentImages(currentIndex);
  }, [isOpen, currentIndex, images, fetchTempLink, preloadAdjacentImages]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    const prevImage = images[prevIndex];
    // Only show loading if not cached
    if (prevImage?.path && !linkCacheRef.current[prevImage.path]) {
      setImageLoading(true);
    }
    setCurrentIndex(prevIndex);
  }, [currentIndex, images]);

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    const nextImage = images[nextIndex];
    // Only show loading if not cached
    if (nextImage?.path && !linkCacheRef.current[nextImage.path]) {
      setImageLoading(true);
    }
    setCurrentIndex(nextIndex);
  }, [currentIndex, images]);

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Download handler - uses Web Share API on mobile, fallback to blob download
  const handleDownload = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const currentImage = images[currentIndex];
    if (!currentImage?.path) {
      showError("Unable to download image");
      return;
    }

    try {
      setDownloading(true);

      const response = await axiosInstance.get(
        `/dropbox/download/${encodeURIComponent(currentImage.path)}`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const filename = currentImage.name || "image.jpg";

      // Check if Web Share API is available and supports files (mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: filename,
            });
            window.URL.revokeObjectURL(url);
            showSuccess("Shared successfully");
            return;
          }
        } catch (shareError) {
          // Share was cancelled or failed, fall through to download
          if (shareError.name !== "AbortError") {
            console.log("Share failed, falling back to download");
          }
        }
      }

      // Fallback: Create download link (no target="_blank" — it causes Safari to navigate)
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      // Prevent Meta Pixel and other global listeners from intercepting the click
      link.addEventListener("click", (e) => e.stopImmediatePropagation());
      document.body.appendChild(link);
      link.click();

      // Delay cleanup to avoid revoking before download starts
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 1500);

      showSuccess("Download started");
    } catch (error) {
      console.error("Download failed:", error);
      showError("Failed to download image");
    } finally {
      setDownloading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const currentUrl = currentImage?.path ? linkCache[currentImage.path] : null;
  const displayUrl = currentUrl || currentImage?.thumbnail;

  // Render via Portal - completely outside DOM hierarchy
  return createPortal(
    <AnimatePresence>
      <motion.div
        className="lightbox-overlay"
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleOverlayClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Close Button */}
        <button type="button" className="lightbox-close" onClick={onClose}>
          <RiCloseLine />
        </button>

        {/* Navigation - Previous */}
        {images.length > 1 && (
          <button
            type="button"
            className="lightbox-nav lightbox-nav-prev"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
          >
            <RiArrowLeftSLine />
          </button>
        )}

        {/* Image Container */}
        <div className="lightbox-image-container">
          {/* Show thumbnail immediately as placeholder */}
          {currentImage?.thumbnail && imageLoading && !currentUrl && (
            <img
              src={currentImage.thumbnail}
              alt=""
              className="lightbox-placeholder-image"
              style={{
                position: 'absolute',
                filter: 'blur(10px)',
                transform: 'scale(1.1)',
                opacity: 0.5
              }}
            />
          )}

          {/* Loading spinner - show while fetching temp link OR while image loads */}
          {imageLoading && (
            <div className="lightbox-loading">
              <RiLoader4Line className="spinner" />
              <span className="loading-text">
                {currentUrl ? "Loading full image..." : "✨ Loading • Worth the wait"}
              </span>
            </div>
          )}

          {/* Main Image */}
          {displayUrl && (
            <motion.img
              key={`${currentIndex}-${currentUrl ? 'full' : 'thumb'}`}
              src={displayUrl}
              alt=""
              className={imageLoading ? 'loading' : 'loaded'}
              initial={{ opacity: 0 }}
              animate={{ opacity: imageLoading ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
              draggable={false}
            />
          )}

          {/* Placeholder when no image available */}
          {!displayUrl && !imageLoading && (
            <div className="lightbox-placeholder">
              <RiImageLine />
              <p>Image not available</p>
            </div>
          )}
        </div>

        {/* Navigation - Next */}
        {images.length > 1 && (
          <button
            type="button"
            className="lightbox-nav lightbox-nav-next"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <RiArrowRightSLine />
          </button>
        )}

        {/* Bottom Controls */}
        <div className="lightbox-controls">
          <span className="lightbox-counter">
            {currentIndex + 1} / {images.length}
          </span>

          <button
            type="button"
            className="lightbox-download"
            onClick={(e) => handleDownload(e)}
            disabled={downloading}
          >
            {downloading ? (
              <RiLoader4Line className="spinner" />
            ) : (
              <RiDownloadLine />
            )}
            <span>Download</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default EventGallery;
