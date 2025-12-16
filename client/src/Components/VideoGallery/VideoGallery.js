import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import "./VideoGallery.scss";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiLoader4Line,
  RiFilmLine,
  RiPlayLine,
  RiPauseLine,
  RiFullscreenLine,
  RiVolumeUpLine,
  RiVolumeMuteLine,
} from "react-icons/ri";

const VideoGallery = ({
  videos = [],
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [videoLoading, setVideoLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { showSuccess, showError } = useToast();
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const blobUrlRef = useRef(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setVideoLoading(true);
      setVideoUrl(null);
      setIsPlaying(false);
    }
  }, [isOpen, initialIndex]);

  // Fetch video when currentIndex changes
  useEffect(() => {
    if (!isOpen || videos.length === 0) return;

    const currentVideo = videos[currentIndex];
    if (!currentVideo?.path) {
      setVideoUrl(null);
      return;
    }

    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    const loadVideo = async () => {
      setVideoLoading(true);
      setIsPlaying(false);
      try {
        const response = await axiosInstance.get(
          `/dropbox/download/${encodeURIComponent(currentVideo.path)}`,
          { responseType: "blob" }
        );

        // Determine mime type from extension
        const extension = currentVideo.extension || currentVideo.name.split('.').pop().toLowerCase();
        const mimeTypes = {
          'mp4': 'video/mp4',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo',
          'webm': 'video/webm',
        };
        const mimeType = mimeTypes[extension] || 'video/mp4';

        const url = URL.createObjectURL(new Blob([response.data], { type: mimeType }));
        blobUrlRef.current = url;
        setVideoUrl(url);
      } catch (err) {
        console.error("Failed to load video:", err);
        setVideoUrl(null);
        showError("Failed to load video");
      } finally {
        setVideoLoading(false);
      }
    };

    loadVideo();

    // Cleanup on unmount
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isOpen, currentIndex, videos, showError]);

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
        case " ": // Spacebar
          e.preventDefault();
          togglePlayPause();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, videos.length]);

  const goToPrevious = useCallback(() => {
    setVideoLoading(true);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : videos.length - 1));
  }, [videos.length]);

  const goToNext = useCallback(() => {
    setVideoLoading(true);
    setCurrentIndex((prev) => (prev < videos.length - 1 ? prev + 1 : 0));
  }, [videos.length]);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  }, []);

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
    const currentVideo = videos[currentIndex];
    if (!currentVideo?.path) {
      showError("Unable to download video");
      return;
    }

    try {
      setDownloading(true);

      const response = await axiosInstance.get(
        `/dropbox/download/${encodeURIComponent(currentVideo.path)}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = currentVideo.name || "video.mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess("Download started");
    } catch (error) {
      console.error("Download failed:", error);
      showError("Failed to download video");
    } finally {
      setDownloading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  };

  const handleVideoLoad = () => {
    setVideoLoading(false);
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  if (!isOpen || videos.length === 0) return null;

  const currentVideo = videos[currentIndex];

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="video-lightbox-overlay"
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
        <button className="video-lightbox-close" onClick={onClose}>
          <RiCloseLine />
        </button>

        {/* Navigation - Previous */}
        {videos.length > 1 && (
          <button
            className="video-lightbox-nav video-lightbox-nav-prev"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
          >
            <RiArrowLeftSLine />
          </button>
        )}

        {/* Video Container */}
        <div className="video-lightbox-container">
          {/* Loading spinner */}
          {videoLoading && (
            <div className="video-lightbox-loading">
              <RiLoader4Line className="spinner" />
              <span className="loading-text">Loading video...</span>
            </div>
          )}

          {/* Video Player */}
          {videoUrl && (
            <motion.div
              className="video-player-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: videoLoading ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="video-player"
                controls
                playsInline
                onLoadedData={handleVideoLoad}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onError={() => {
                  setVideoLoading(false);
                  showError("Failed to play video");
                }}
              />
            </motion.div>
          )}

          {/* Placeholder when no video */}
          {!videoUrl && !videoLoading && (
            <div className="video-lightbox-placeholder">
              <RiFilmLine />
              <p>Video not available</p>
            </div>
          )}
        </div>

        {/* Navigation - Next */}
        {videos.length > 1 && (
          <button
            className="video-lightbox-nav video-lightbox-nav-next"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <RiArrowRightSLine />
          </button>
        )}

        {/* Bottom Controls */}
        <div className="video-lightbox-controls">
          <span className="video-lightbox-counter">
            {currentIndex + 1} / {videos.length}
          </span>

          <span className="video-lightbox-name" title={currentVideo?.name}>
            {currentVideo?.name}
          </span>

          <button
            className="video-lightbox-download"
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

export default VideoGallery;
