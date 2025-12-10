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
  const [fullImageUrl, setFullImageUrl] = useState(null);
  const { showSuccess, showError } = useToast();
  const containerRef = useRef(null);
  const blobUrlRef = useRef(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Reset index only when modal opens (not when initialIndex changes from re-renders)
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setImageLoading(true);
      setFullImageUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen - initialIndex is captured at open time

  // Fetch full image when currentIndex changes
  useEffect(() => {
    if (!isOpen || images.length === 0) return;

    const currentImage = images[currentIndex];
    if (!currentImage?.path) {
      // No path, fallback to thumbnail
      setFullImageUrl(currentImage?.thumbnail || null);
      return;
    }

    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    const loadFullImage = async () => {
      setImageLoading(true);
      try {
        const response = await axiosInstance.get(
          `/dropbox/download/${encodeURIComponent(currentImage.path)}`,
          { responseType: "blob" }
        );
        const url = URL.createObjectURL(new Blob([response.data]));
        blobUrlRef.current = url;
        setFullImageUrl(url);
      } catch (err) {
        // Fallback to thumbnail if full image fetch fails
        setFullImageUrl(currentImage.thumbnail || null);
      }
    };

    loadFullImage();

    // Cleanup on unmount or when dependencies change
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isOpen, currentIndex, images]);

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
    setImageLoading(true);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setImageLoading(true);
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

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

  // Download handler
  const handleDownload = async () => {
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

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = currentImage.name || "image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
        <button className="lightbox-close" onClick={onClose}>
          <RiCloseLine />
        </button>

        {/* Navigation - Previous */}
        {images.length > 1 && (
          <button
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
          {/* Loading spinner - always centered on top */}
          {imageLoading && (
            <div className="lightbox-loading">
              <RiLoader4Line className="spinner" />
              <span className="loading-text">Loading...</span>
            </div>
          )}

          {/* Image - hidden completely while loading to prevent alt text showing */}
          {fullImageUrl && (
            <motion.img
              key={currentIndex}
              src={fullImageUrl}
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
          {!fullImageUrl && !imageLoading && (
            <div className="lightbox-placeholder">
              <RiImageLine />
              <p>Image not available</p>
            </div>
          )}
        </div>

        {/* Navigation - Next */}
        {images.length > 1 && (
          <button
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
            className="lightbox-download"
            onClick={handleDownload}
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
